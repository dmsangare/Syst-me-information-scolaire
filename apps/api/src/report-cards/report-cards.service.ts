import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from "@nestjs/common";
import QRCode from "qrcode";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { VerificationService } from "../verification/verification.service";
import { ReportCardGenerateDto, ReportCardUpdateDto } from "./dto";
import { calculateSubjectAverage } from "./calculation/second-cycle";
import { calculateCompositionAverage } from "./calculation/first-cycle";
import { determineDecision as determineDecisionEngine } from "./calculation/decision";
import { calculateRank } from "./calculation/common";
import { DashboardService } from "../dashboard/dashboard.service";
import {
  isTermAllowedForCycle,
  describeTermMismatch,
  normalizeScore,
  rulesForCycle,
  scaledThreshold,
} from "./grading-rules";
import { fileToBase64 } from "../common/utils/file-to-base64.util";
import { CurrentUserPayload } from "../common/decorators";

@Injectable()
export class ReportCardsService {
  private readonly logger = new Logger(ReportCardsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verificationService: VerificationService,
    private readonly dashboard: DashboardService,
  ) {}

  private async refreshHonorRoll(schoolId: string | null | undefined, termId: string) {
    if (!schoolId) return;
    try {
      await this.dashboard.recomputeTopStudents(schoolId, termId);
    } catch (err) {
      this.logger.warn(`Recalcul du tableau d'honneur impossible : ${(err as Error).message}`);
    }
  }

  async findAll(
    schoolId: string | null,
    page = 1,
    limit = 20,
    termId?: string,
    classId?: string,
    studentId?: string,
    user?: { id: string; roles: string[] },
  ) {
    const where: any = {};
    if (schoolId) where.student = { schoolId };
    if (termId) where.termId = termId;
    if (classId) where.classId = classId;
    if (studentId) where.studentId = studentId;

    if (user && user.roles.includes("STUDENT")) {
      const student = await this.prisma.student.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!student) {
        throw new ForbiddenException("Aucune fiche eleve nest associee a votre compte.");
      }
      where.studentId = student.id;
    }

    if (user && user.roles.includes("PARENT")) {
      const parent = await this.prisma.guardian.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });
      if (parent) {
        where.student = { ...where.student, studentGuardians: { some: { guardianId: parent.id } } };
      } else {
        where.studentId = "00000000-0000-0000-0000-000000000000";
      }
    }

    const isTeacherOnly =
      user &&
      user.roles.includes("TEACHER") &&
      !user.roles.includes("SUPER_ADMIN") &&
      !user.roles.includes("DIRECTOR") &&
      !user.roles.includes("SECRETARY");

    if (isTeacherOnly && user) {
      const teacher = await this.prisma.teacher.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });

      if (teacher) {
        const assignments = await this.prisma.teacherAssignment.findMany({
          where: { teacherId: teacher.id },
          select: { classId: true },
        });
        const teacherClassIds = [...new Set(assignments.map((a) => a.classId))];

        if (classId) {
          where.classId = teacherClassIds.includes(classId) ? classId : "00000000-0000-0000-0000-000000000000";
        } else {
          where.classId = { in: teacherClassIds };
        }
      } else {
        where.classId = "00000000-0000-0000-0000-000000000000";
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.reportCard.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
          class: { select: { id: true, code: true, name: true } },
          term: { select: { id: true, name: true } },
          academicYear: { select: { id: true, label: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.reportCard.count({ where }),
    ]);

    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const report = await this.prisma.reportCard.findUnique({
      where: { id },
      include: {
        student: true,
        class: { include: { level: true } },
        term: true,
        academicYear: true,
        items: {
          include: {
            subject: { select: { id: true, code: true, name: true } },
          },
          orderBy: { subject: { name: "asc" } },
        },
      },
    });
    if (!report) throw new NotFoundException("Bulletin introuvable");
    return report;
  }

  async generate(dto: ReportCardGenerateDto, user?: CurrentUserPayload) {
    const whereEnrollments: any = {
      academicYearId: dto.academicYearId,
      status: "VALIDATED",
    };
    if (dto.classId) whereEnrollments.classId = dto.classId;
    if (dto.studentId) whereEnrollments.studentId = dto.studentId;
    if (user?.schoolId) {
      whereEnrollments.student = { schoolId: user.schoolId };
    }

    const allEnrollments = await this.prisma.enrollment.findMany({
      where: whereEnrollments,
      include: { student: true },
    });

    if (allEnrollments.length === 0) {
      throw new BadRequestException("Aucun eleve inscrit trouve");
    }

    const existingLocked = await this.prisma.reportCard.findMany({
      where: {
        studentId: { in: allEnrollments.map((e) => e.studentId) },
        termId: dto.termId,
        status: { in: ["VALIDATED", "PUBLISHED"] },
      },
      select: { studentId: true, status: true },
    });

    const lockedStudentIds = new Set(existingLocked.map((r) => r.studentId));
    const skipped = existingLocked.map((r) => {
      const enr = allEnrollments.find((e) => e.studentId === r.studentId);
      return {
        studentId: r.studentId,
        studentName: enr ? `${enr.student.firstName} ${enr.student.lastName}` : r.studentId,
        status: r.status,
      };
    });

    const term = await this.prisma.term.findUnique({ where: { id: dto.termId } });
    if (!term) throw new NotFoundException("Periode introuvable");
    if (term.isLocked) {
      throw new BadRequestException(
        "Cette periode est verrouillee. Impossible de generer les bulletins.",
      );
    }

    const levels = await this.prisma.level.findMany({
      where: { id: { in: Array.from(new Set(allEnrollments.map((e) => e.levelId))) } },
      select: { id: true, cycle: true },
    });
    const cycleByLevel = new Map<string, string>(levels.map((l) => [l.id, l.cycle as string]));

    const enrollments = allEnrollments.filter((e) =>
      isTermAllowedForCycle(term.type, cycleByLevel.get(e.levelId)) &&
      !lockedStudentIds.has(e.studentId),
    );
    if (enrollments.length === 0) {
      if (lockedStudentIds.size > 0) {
        throw new BadRequestException(
          `Tous les bulletins de cette periode sont deja valides/publies (${lockedStudentIds.size} saute(s)).`,
        );
      }
      throw new BadRequestException(describeTermMismatch(term.type, term.name));
    }

    const scaleByClass = new Map<string, number>();
    const schoolIdForAbsence = user?.schoolId ?? null;
    const blockedStudents = schoolIdForAbsence && dto.classId
      ? await this.detectUnjustifiedAbsences(dto.classId, dto.termId, schoolIdForAbsence)
      : new Set<string>();
    const overriddenStudents = dto.classId
      ? await this.getOverrideStudentIds(dto.classId, dto.termId)
      : new Set<string>();

    for (const e of enrollments) {
      scaleByClass.set(e.classId, rulesForCycle(cycleByLevel.get(e.levelId)).scale);
    }

    const coefficientRows = await this.prisma.subjectCoefficient.findMany({
      where: { levelId: { in: Array.from(new Set(enrollments.map((e) => e.levelId))) } },
      include: { subject: true },
    });
    const subjectsByLevel = new Map<
      string,
      Array<{ subjectId: string; name: string; coefficient: number }>
    >();
    for (const r of coefficientRows) {
      if (!subjectsByLevel.has(r.levelId)) subjectsByLevel.set(r.levelId, []);
      subjectsByLevel.get(r.levelId)!.push({
        subjectId: r.subjectId,
        name: r.subject.name,
        coefficient: Number(r.coefficient),
      });
    }

    const classIds = Array.from(new Set(enrollments.map((e) => e.classId)));
    const assessments = await this.prisma.assessment.findMany({
      where: {
        termId: dto.termId,
        classId: { in: classIds },
        status: { in: ["VALIDATED", "LOCKED"] },
      },
      include: { grades: true },
    });

    const draftAssessments = await this.prisma.assessment.findMany({
      where: {
        termId: dto.termId,
        classId: { in: classIds },
        status: { in: ["DRAFT", "OPEN", "SUBMITTED"] },
      },
      select: { id: true, classId: true, subjectId: true, status: true },
    });

    const gradesMap = new Map<string, Map<string, Array<{ value: number; coefficient: number }>>>();
    for (const a of assessments) {
      for (const g of a.grades) {
        if (g.value === null || g.isAbsent) continue;
        if (!gradesMap.has(g.studentId)) gradesMap.set(g.studentId, new Map());
        const subMap = gradesMap.get(g.studentId)!;
        if (!subMap.has(a.subjectId)) subMap.set(a.subjectId, []);
        const scale = scaleByClass.get(a.classId) ?? 20;
        subMap.get(a.subjectId)!.push({
          value: normalizeScore(Number(g.value), Number(a.maxScore), scale),
          coefficient: Number(a.coefficient),
        });
      }
    }

    const results: Array<{
      studentId: string;
      classId: string;
      scale: number;
      cycle: string;
      average: number | null;
      subjectAverages: Array<{ subjectId: string; average: number | null; coefficient: number }>;
    }> = [];

    for (const e of enrollments) {
      const studentGrades = gradesMap.get(e.studentId) || new Map();
      const subjectAverages: Array<{ subjectId: string; average: number | null; coefficient: number }> = [];

      const cycle = cycleByLevel.get(e.levelId) as string;
      const subjectsForThisLevel = subjectsByLevel.get(e.levelId) ?? [];
      for (const sc of subjectsForThisLevel) {
        const grades = studentGrades.get(sc.subjectId) || [];
        const gradeInputs = grades.map((g: any) => ({
          value: g.value,
          isAbsent: g.isAbsent ?? false,
          isExempt: g.isExempt ?? false,
        }));
        const partialResult = cycle === "PREMIER_CYCLE"
          ? calculateCompositionAverage(gradeInputs)
          : calculateSubjectAverage(gradeInputs);
        subjectAverages.push({
          subjectId: sc.subjectId,
          average: partialResult.value,
          coefficient: sc.coefficient,
        });
      }

      let generalAverage: number | null = null;
      if (cycle === "PREMIER_CYCLE") {
        const valid = subjectAverages.filter(sa => sa.average !== null).map(sa => sa.average as number);
        generalAverage = valid.length > 0
          ? Math.round((valid.reduce((s, v) => s + v, 0) / valid.length) * 100) / 100
          : null;
      } else {
        const { calculateTermAverage } = require("./calculation/second-cycle");
        generalAverage = calculateTermAverage(
          subjectAverages.map((sa) => ({ average: sa.average, coefficient: sa.coefficient })),
        ).value;
      }

      results.push({
        studentId: e.studentId,
        classId: e.classId,
        scale: scaleByClass.get(e.classId) ?? 20,
        cycle: cycleByLevel.get(e.levelId) ?? "DEUXIEME_CYCLE",
        average: generalAverage,
        subjectAverages,
      });
    }

    const byClass = new Map<string, number[]>();
    for (const r of results) {
      if (!byClass.has(r.classId)) byClass.set(r.classId, []);
      if (r.average !== null) byClass.get(r.classId)!.push(r.average);
    }

    const settings = await this.prisma.setting.findFirst({
      where: { school: { students: { some: { id: enrollments[0].studentId } } } },
    });
    const passMark = settings ? Number(settings.passMark) : 10;

    const created: any[] = [];
    for (const r of results) {
      const classAverages = byClass.get(r.classId) || [];

      let rank: number | null = null;
      if (r.average !== null) {
        rank = calculateRank(r.average, classAverages);
      }

      const attendanceStats = await this.prisma.attendanceRecord.findMany({
        where: {
          studentId: r.studentId,
          session: { termId: dto.termId },
        },
      });
      const absencesCount = attendanceStats.filter(
        (a) => a.status === "ABSENT" || a.status === "ABSENT_UNJUSTIFIED",
      ).length;
      const latesCount = attendanceStats.filter((a) => a.status === "LATE").length;

      const rawDecision = r.average !== null
        ? determineDecisionEngine(r.average, true, {
            passingScore: scaledThreshold(passMark, r.scale),
            examScore: null,
          })
        : "INCOMPLET";

      let decision: "ADMIS" | "REDOUBLE" | "A_DETERMINER" =
        rawDecision === "ADMIS" ? "ADMIS"
          : rawDecision === "REDOUBLE" ? "REDOUBLE"
            : "A_DETERMINER";

      const isStudentBlockedForDecision = blockedStudents.has(r.studentId) && !overriddenStudents.has(r.studentId);
      if (isStudentBlockedForDecision) {
        decision = "A_DETERMINER";
      }

      const assessmentsForClass = assessments.filter((a: any) => a.classId === r.classId);
      const hasExpectedAssessments = assessmentsForClass.length > 0;
      const allSubjectsHaveAverage = r.subjectAverages.length > 0
        && r.subjectAverages.every((sa: any) => sa.average !== null);
      let isComplete = hasExpectedAssessments && allSubjectsHaveAverage;

      const isStudentBlocked = blockedStudents.has(r.studentId) && !overriddenStudents.has(r.studentId);
      if (isStudentBlocked) {
        isComplete = false;
      }

      const classSize = await this.prisma.enrollment.count({
        where: { classId: r.classId, academicYearId: dto.academicYearId, status: "VALIDATED" },
      });

      const report = await this.prisma.reportCard.upsert({
        where: {
          studentId_termId: { studentId: r.studentId, termId: dto.termId },
        },
        update: {
          scale: r.scale,
          average: r.average,
          rank,
          classSize: classSize,
          absencesCount,
          latesCount,
          decision: decision as any,
          kind: dto.kind ?? (r.cycle === "PREMIER_CYCLE" ? "COMPOSITION" : "TRIMESTRIEL"),
          isComplete,
          isStale: false,
        },
        create: {
          studentId: r.studentId,
          classId: r.classId,
          termId: dto.termId,
          academicYearId: dto.academicYearId,
          average: r.average,
          rank,
          classSize: classSize,
          absencesCount,
          latesCount,
          decision: decision as any,
          scale: r.scale,
          status: "DRAFT",
          kind: dto.kind ?? (r.cycle === "PREMIER_CYCLE" ? "COMPOSITION" : "TRIMESTRIEL"),
          isComplete,
          isStale: false,
        },
      });

      await this.prisma.reportCardItem.deleteMany({ where: { reportCardId: report.id } });

      await this.prisma.reportCardItem.createMany({
        data: r.subjectAverages.map((sa) => ({
          reportCardId: report.id,
          subjectId: sa.subjectId,
          average: sa.average,
          coefficient: sa.coefficient,
          weighted: sa.average !== null ? sa.average * sa.coefficient : null,
        })),
      });

      created.push(report);
    }

    this.logger.log(`Generated ${created.length} report cards for term ${dto.termId}`);

    const blockedStudentIds = Array.from(blockedStudents).filter(
      (sid) => !overriddenStudents.has(sid),
    );
    const blockedWarnings = blockedStudentIds.length > 0
      ? [{
          type: "BULLETINS_BLOCKED_BY_ABSENCE",
          message: `${blockedStudentIds.length} bulletin(s) bloqué(s) par absence non traitée`,
          count: blockedStudentIds.length,
          studentIds: blockedStudentIds,
        }]
      : [];

    const warnings = draftAssessments.length > 0
      ? [{
          type: "UNVALIDATED_ASSESSMENTS",
          message: `${draftAssessments.length} evaluation(s) non validee(s) ne sont pas incluses dans les bulletins`,
          count: draftAssessments.length,
          assessments: draftAssessments,
        }]
      : [];

    return {
      generated: created.length,
      skipped,
      skippedCount: skipped.length,
      warnings: [...blockedWarnings, ...warnings],
      reports: created,
    };
  }

  private async detectUnjustifiedAbsences(
    classId: string,
    termId: string,
    schoolId: string,
  ): Promise<Set<string>> {
    const blocked = new Set<string>();

    const attendance = await this.prisma.attendanceRecord.findMany({
      where: {
        session: { termId, classId },
        status: { in: ["ABSENT", "ABSENT_UNJUSTIFIED"] as any },
        student: { schoolId },
      },
      select: { studentId: true },
    });
    for (const a of attendance) blocked.add(a.studentId);

    const grades = await this.prisma.grade.findMany({
      where: {
        status: "ABSENT" as any,
        assessment: { termId, classId, type: "COMPOSITION" as any },
        student: { schoolId },
      },
      select: { studentId: true },
    });
    for (const g of grades) blocked.add(g.studentId);

    return blocked;
  }

  private async getOverrideStudentIds(
    classId: string,
    termId: string,
  ): Promise<Set<string>> {
    const overrides = await this.prisma.reportCardAbsenceOverride.findMany({
      where: { reportCard: { classId, termId } },
      include: { reportCard: { select: { studentId: true } } },
    });
    return new Set(overrides.map((o) => o.reportCard.studentId));
  }

  async update(id: string, dto: ReportCardUpdateDto, user?: CurrentUserPayload) {
    const report = await this.findOne(id);
    if (user?.schoolId && report.student?.schoolId !== user.schoolId) {
      throw new ForbiddenException("Acces interdit");
    }
    if (report.status === "PUBLISHED") {
      throw new BadRequestException("Impossible de modifier un bulletin publie");
    }
    return this.prisma.reportCard.update({
      where: { id },
      data: {
        ...dto,
        decision: dto.decision as any,
        conductScore: dto.conductScore ?? undefined,
        conductAppreciation: dto.conductAppreciation,
      },
    });
  }

  async publish(id: string, user?: CurrentUserPayload) {
    const report = await this.findOne(id);
    if (user?.schoolId && report.student?.schoolId !== user.schoolId) {
      throw new ForbiddenException("Acces interdit");
    }
    if (report.status === "PUBLISHED") {
      throw new BadRequestException("Ce bulletin est deja publie");
    }
    const setting = await this.prisma.setting.findUnique({
      where: { schoolId: report.student?.schoolId ?? "" },
      select: { gradingScale: true, passMark: true, locale: true, timezone: true },
    });

    const snapshot = {
      capturedAt: new Date().toISOString(),
      capturedBy: user?.id ?? "system",
      version: "1.0",
      settings: setting
        ? {
            gradingScale: report.scale ?? Number(setting.gradingScale),
            passMark: report.scale
              ? Math.round(Number(setting.passMark) * report.scale / Number(setting.gradingScale) * 100) / 100
              : Number(setting.passMark),
            locale: setting.locale,
            timezone: setting.timezone,
          }
        : null,
      report: {
        id: report.id,
        studentId: report.studentId,
        average: report.average,
        rank: report.rank,
        decision: report.decision,
      },
    };
    const published = await this.prisma.reportCard.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date(), snapshot },
    });
    await this.refreshHonorRoll(report.student?.schoolId, report.termId);
    return published;
  }

  async publishByClass(classId: string, termId: string) {
    const result = await this.prisma.reportCard.updateMany({
      where: { classId, termId, status: "VALIDATED" },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    if (result.count > 0) {
      const cls = await this.prisma.class.findUnique({ where: { id: classId }, select: { schoolId: true } });
      await this.refreshHonorRoll(cls?.schoolId, termId);
    }
    return { published: result.count };
  }

  async reopen(id: string, motive: string, user?: CurrentUserPayload) {
    const report = await this.findOne(id);
    if (user?.schoolId && report.student?.schoolId !== user.schoolId) {
      throw new ForbiddenException("Acces interdit");
    }
    if (report.status !== "VALIDATED" && report.status !== "PUBLISHED") {
      throw new BadRequestException("Seul un bulletin valide ou publie peut etre rouvert");
    }

    try {
      const verifiableDocs = await this.prisma.verifiableDocument.findMany({
        where: { referenceId: id, type: "BULLETIN", revokedAt: null },
      });
      for (const doc of verifiableDocs) {
        await this.verificationService.revoke(doc.shortCode, user?.id ?? "system");
      }
    } catch (err) {
      this.logger.warn(`Erreur revocation QR pour bulletin ${id}: ${err}`);
    }

    return this.prisma.reportCard.update({
      where: { id },
      data: {
        status: "DRAFT",
        snapshot: Prisma.DbNull,
        publishedAt: null,
      },
    });
  }

  async validate(id: string, user?: CurrentUserPayload) {
    const report = await this.findOne(id);
    if (user?.schoolId && report.student?.schoolId !== user.schoolId) {
      throw new ForbiddenException("Acces interdit");
    }

    const setting = await this.prisma.setting.findUnique({
      where: { schoolId: report.student?.schoolId ?? "" },
      select: { gradingScale: true, passMark: true, locale: true, timezone: true },
    });

    const snapshot = {
      capturedAt: new Date().toISOString(),
      capturedBy: user?.id ?? "system",
      version: "1.0",
      settings: setting
        ? {
            gradingScale: report.scale ?? Number(setting.gradingScale),
            passMark: report.scale
              ? Math.round(Number(setting.passMark) * report.scale / Number(setting.gradingScale) * 100) / 100
              : Number(setting.passMark),
            locale: setting.locale,
            timezone: setting.timezone,
          }
        : null,
      report: {
        id: report.id,
        studentId: report.studentId,
        average: report.average,
        rank: report.rank,
        classSize: report.classSize,
        decision: report.decision,
        items: (report as any).items?.map((i: any) => ({
          subjectId: i.subjectId,
          average: i.average,
          coefficient: i.coefficient,
          weighted: i.weighted,
        })) ?? [],
      },
    };

    return this.prisma.reportCard.update({
      where: { id },
      data: { status: "VALIDATED", snapshot },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.reportCard.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) throw new NotFoundException("Bulletin introuvable");
    if (existing.status === "PUBLISHED" || existing.status === "VALIDATED") {
      throw new BadRequestException(
        "Impossible de supprimer un bulletin valide ou publie.",
      );
    }

    const report = await this.findOne(id);
    if (report.status === "PUBLISHED") {
      throw new BadRequestException("Impossible de supprimer un bulletin publie");
    }
    return this.prisma.reportCard.delete({ where: { id } });
  }

  async getStudentReport(studentId: string, termId: string) {
    const report = await this.prisma.reportCard.findUnique({
      where: { studentId_termId: { studentId, termId } },
      include: {
        student: true,
        class: { include: { level: true } },
        term: true,
        academicYear: true,
        items: {
          include: { subject: true },
          orderBy: { subject: { name: "asc" } },
        },
      },
    });
    if (!report) throw new NotFoundException("Bulletin introuvable pour cet eleve et ce trimestre");
    return report;
  }

  async getClassRanking(classId: string, termId: string) {
    const reports = await this.prisma.reportCard.findMany({
      where: { classId, termId },
      orderBy: { rank: "asc" },
      include: {
        student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
      },
    });

    return reports.map((r) => ({
      rank: r.rank,
      student: r.student,
      average: r.average,
      decision: r.decision,
      absences: r.absencesCount,
      lates: r.latesCount,
    }));
  }

  async getAnnualExportData(id: string, user?: CurrentUserPayload) {
    const report = await this.prisma.reportCard.findUnique({
      where: { id },
      include: {
        student: true,
        class: { include: { level: true } },
        academicYear: true,
      },
    });
    if (!report) throw new NotFoundException("Bulletin introuvable");
    if (user?.schoolId && report.student.schoolId !== user.schoolId) {
      throw new ForbiddenException("Acces interdit");
    }

    const cycle = (report.class?.level?.cycle === "PREMIER_CYCLE" ? "PREMIER_CYCLE" : "DEUXIEME_CYCLE") as "PREMIER_CYCLE" | "DEUXIEME_CYCLE";

    const terms = await this.prisma.term.findMany({
      where: {
        academicYearId: report.academicYearId,
        type: cycle === "PREMIER_CYCLE" ? "MOIS" : "TRIMESTRE",
      },
      orderBy: { startDate: "asc" },
    });

    const periodReports = await this.prisma.reportCard.findMany({
      where: {
        studentId: report.studentId,
        academicYearId: report.academicYearId,
        kind: cycle === "PREMIER_CYCLE" ? "COMPOSITION" : "TRIMESTRIEL",
        termId: { in: terms.map((t) => t.id) },
      },
    });

    const periods = terms.map((t) => {
      const r = periodReports.find((pr) => pr.termId === t.id);
      return {
        label: t.name,
        average: r?.average !== null && r?.average !== undefined ? Number(r.average) : null,
        rank: r?.rank ?? null,
      };
    });

    const validAverages = periods.map((p) => p.average).filter((a): a is number => a !== null);
    const annualSum = validAverages.length > 0
      ? Math.round(validAverages.reduce((s, v) => s + v, 0) * 100) / 100
      : null;
    const annualAverage = annualSum !== null && validAverages.length > 0
      ? Math.round((annualSum / validAverages.length) * 100) / 100
      : null;

    let rank: number | null = null;
    if (annualAverage !== null) {
      const classmates = await this.prisma.reportCard.findMany({
        where: { classId: report.classId, academicYearId: report.academicYearId, kind: "ANNUEL", average: { not: null } },
        select: { average: true },
      });
      const all = classmates.map((c) => Number(c.average)).filter((a) => !Number.isNaN(a));
      if (all.length > 0) rank = all.filter((a) => a > annualAverage).length + 1;
    }

    // ⬇ RECUPERATION PROPRE DU NOM DE L'ECOLE (plus de fallback SIS-MALI)
    const school = await this.prisma.school.findUnique({
      where: { id: report.student.schoolId },
    });
    if (!school?.name) {
      throw new BadRequestException(
        "Le nom de l'établissement n'est pas configuré. Rendez-vous dans Paramètres → Établissement.",
      );
    }

    // QR code
    let qrCodeDataUrl: string | null = null;
    try {
      const signResult = await this.verificationService.sign({
        schoolId: report.student.schoolId,
        type: "BULLETIN",
        referenceId: id,
        meta: { studentId: report.studentId, academicYearId: report.academicYearId, kind: "ANNUEL" },
      });
      qrCodeDataUrl = await QRCode.toDataURL(signResult.verificationUrl);
    } catch (err) {
      this.logger.error(`[QR-ANNUAL] Generation failed: ${(err as Error).message}`);
    }

    // Total des coefficients et pondérations (sur les items du bulletin annuel)
    const reportWithItems = await this.prisma.reportCard.findUnique({
      where: { id },
      include: { items: true },
    });
    const totalCoefficient = reportWithItems?.items.reduce(
      (sum, item) => sum + Number(item.coefficient),
      0,
    ) ?? 0;
    const totalWeighted = reportWithItems?.items.reduce(
      (sum, item) => sum + (Number(item.weighted) || 0),
      0,
    ) ?? 0;

    return {
      // ⬇ TOUTES LES COORDONNEES DE L'ECOLE (nom, adresse, téléphone, devise, logo, cachet, académie, CAP)
      schoolName: school.name,
      schoolAddress: school.address,
      schoolPhone: school.phone,
      schoolMotto: school.motto,
      schoolLogoUrl: await fileToBase64(school.logoUrl),
      schoolStampBase64: await fileToBase64(school.stampUrl),
      schoolAcademy: school.academy,
      schoolCap: school.cap,
      qrCodeDataUrl,
      studentName: `${report.student.lastName} ${report.student.firstName}`,
      studentMatricule: report.student.matricule,
      studentGender: report.student.gender,
      studentBirthDate: report.student.birthDate.toISOString().split("T")[0],
      studentBirthPlace: report.student.birthPlace,
      className: report.class?.name || "",
      classSize: report.classSize || 0,
      academicYear: report.academicYear?.label || "",
      cycle,
      periods,
      annualSum,
      annualAverage,
      rank,
      decision: report.decision,
      decisionLabel: report.decision === "ADMIS" || report.decision === "PASSE" ? "Admis en classe supérieure" : report.decision === "REDOUBLE" ? "Redouble" : "À déterminer",
      appreciation: report.appreciation,
      scale: Number(report.scale) || 20,
      absencesCount: report.absencesCount,
      latesCount: report.latesCount,
    };
  }

  async getExportData(id: string, user?: CurrentUserPayload) {
    // QR code
    let qrCodeDataUrl: string | null = null;
    try {
      const card = await this.prisma.reportCard.findUnique({
        where: { id },
        select: { studentId: true, termId: true, student: { select: { schoolId: true } } },
      });
      if (card) {
        const signResult = await this.verificationService.sign({
          schoolId: card.student.schoolId,
          type: "BULLETIN",
          referenceId: id,
          meta: { studentId: card.studentId, termId: card.termId },
        });
        qrCodeDataUrl = await QRCode.toDataURL(signResult.verificationUrl);
      }
    } catch (err) {
      this.logger.error(`[QR] Generation failed: ${(err as Error).message}`);
    }

    const report = await this.prisma.reportCard.findUnique({
      where: { id },
      include: {
        student: true,
        class: { include: { level: true } },
        term: true,
        academicYear: true,
        items: {
          include: { subject: true },
        },
      },
    });

    if (!report) {
      throw new NotFoundException("Bulletin introuvable");
    }

    // ⬇ RECUPERATION PROPRE DU NOM DE L'ECOLE (plus de fallback SIS-MALI)
    const school = await this.prisma.school.findUnique({
      where: { id: report.student.schoolId },
    });
    if (!school?.name) {
      throw new BadRequestException(
        "Le nom de l'établissement n'est pas configuré. Rendez-vous dans Paramètres → Établissement.",
      );
    }

    const totalCoefficient = report.items.reduce(
      (sum, item) => sum + Number(item.coefficient),
      0,
    );
    const totalWeighted = report.items.reduce(
      (sum, item) => sum + (Number(item.weighted) || 0),
      0,
    );

    return {
      // ⬇ TOUTES LES COORDONNEES DE L'ECOLE
      schoolName: school.name,
      schoolAddress: school.address,
      schoolPhone: school.phone,
      schoolMotto: school.motto,
      schoolLogoUrl: await fileToBase64(school.logoUrl),
      schoolStampBase64: await fileToBase64(school.stampUrl),
      schoolAcademy: school.academy,
      schoolCap: school.cap,
      qrCodeDataUrl,

      studentName: `${report.student.lastName} ${report.student.firstName}`,
      studentMatricule: report.student.matricule,
      studentGender: report.student.gender,
      studentBirthDate: report.student.birthDate.toISOString().split("T")[0],
      studentBirthPlace: report.student.birthPlace,

      className: report.class?.name || "",
      classSize: report.classSize || 0,
      termName: report.term?.name || "",
      academicYear: report.academicYear?.label || "",

      items: report.items.map((item) => ({
        subjectName: item.subject?.name || "",
        coefficient: Number(item.coefficient),
        average: item.average !== null ? Number(item.average) : null,
        weighted: item.weighted !== null ? Number(item.weighted) : null,
        rank: item.rank,
      })),
      totalCoefficient,
      totalWeighted,
      generalAverage:
        report.average !== null ? Number(report.average) : null,
      rank: report.rank,
      absencesCount: report.absencesCount,
      latesCount: report.latesCount,

      decision: report.decision,
      appreciation: report.appreciation,
    };
  }

  async clearAbsences(
    reportCardId: string,
    motive: string,
    user: CurrentUserPayload,
  ) {
    const trimmed = motive.trim();
    if (trimmed.length < 5 || trimmed.length > 500) {
      throw new BadRequestException("Motif invalide : 5 à 500 caractères requis (espaces exclus).");
    }

    const report = await this.prisma.reportCard.findUnique({
      where: { id: reportCardId },
      include: { student: { select: { schoolId: true } } },
    });
    if (!report) throw new NotFoundException("Bulletin introuvable");
    if (user.schoolId && report.student.schoolId !== user.schoolId) {
      throw new ForbiddenException("Accès interdit");
    }

    const existing = await this.prisma.reportCardAbsenceOverride.findUnique({
      where: { reportCardId },
    });
    if (existing) {
      throw new BadRequestException("Une dérogation existe déjà pour ce bulletin.");
    }

    return this.prisma.reportCardAbsenceOverride.create({
      data: {
        reportCardId,
        schoolId: report.student.schoolId,
        clearedBy: user.id,
        motive: trimmed,
      },
    });
  }

  async recomputeIsCompleteForAssessment(assessmentId: string): Promise<void> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { classId: true, termId: true },
    });
    if (!assessment) return;

    const reports = await this.prisma.reportCard.findMany({
      where: { classId: assessment.classId, termId: assessment.termId },
      include: { items: true },
    });

    for (const report of reports) {
      const hasAssessments = await this.prisma.assessment.count({
        where: {
          classId: assessment.classId,
          termId: assessment.termId,
          status: { in: ["VALIDATED", "LOCKED"] as any },
        },
      });

      const allSubjectsHaveAverage =
        report.items.length > 0 &&
        report.items.every((i) => i.average !== null);

      const isComplete = hasAssessments > 0 && allSubjectsHaveAverage;

      await this.prisma.reportCard.update({
        where: { id: report.id },
        data: { isComplete },
      });
    }
  }

  async computeAnnualAverage(studentId: string, academicYearId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        academicYearId,
        status: "VALIDATED",
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, matricule: true, schoolId: true } },
        class: { include: { level: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException("Élève non inscrit pour cette année");
    }

    const cycle = enrollment.class.level?.cycle === "PREMIER_CYCLE"
      ? "PREMIER_CYCLE"
      : "DEUXIEME_CYCLE";
    const scale = cycle === "PREMIER_CYCLE" ? 10 : 20;

    const termType = cycle === "PREMIER_CYCLE" ? "MOIS" : "TRIMESTRE";
    const terms = await this.prisma.term.findMany({
      where: { academicYearId, type: termType },
      orderBy: { startDate: "asc" },
    });

    const kind = cycle === "PREMIER_CYCLE" ? "COMPOSITION" : "TRIMESTRIEL";
    const reportCards = await this.prisma.reportCard.findMany({
      where: {
        studentId,
        academicYearId,
        kind,
        termId: { in: terms.map((t) => t.id) },
      },
    });

    const validAverages = reportCards
      .map((r) => (r.average !== null ? Number(r.average) : null))
      .filter((a): a is number => a !== null);

    const annualAverage = validAverages.length > 0
      ? Math.round((validAverages.reduce((s, v) => s + v, 0) / validAverages.length) * 100) / 100
      : null;

    const settings = await this.prisma.setting.findUnique({
      where: { schoolId: enrollment.student.schoolId },
      select: { passMark: true },
    });
    const passMarkOn20 = settings ? Number(settings.passMark) : 10;
    const passingScore = Math.round(((passMarkOn20 * scale) / 20) * 100) / 100;

    const complete = reportCards.length > 0 && validAverages.length === terms.length;
    let suggestedDecision: string;
    let reason: string;

    if (annualAverage === null || !complete) {
      suggestedDecision = "INCOMPLET";
      reason = `Bulletins manquants : ${validAverages.length}/${terms.length} périodes disponibles`;
    } else if (annualAverage >= passingScore) {
      suggestedDecision = "ADMIS";
      reason = `Moyenne annuelle ${annualAverage}/${scale} ≥ ${passingScore}/${scale}`;
    } else {
      suggestedDecision = "REDOUBLE";
      reason = `Moyenne annuelle ${annualAverage}/${scale} < ${passingScore}/${scale}`;
    }

    return {
      studentId: enrollment.studentId,
      studentName: `${enrollment.student.lastName} ${enrollment.student.firstName}`,
      matricule: enrollment.student.matricule,
      className: enrollment.class.name,
      cycle,
      scale,
      annualAverage,
      passingScore,
      suggestedDecision,
      reason,
      complete,
      periodsCount: terms.length,
      periodsAvailable: validAverages.length,
    };
  }
}