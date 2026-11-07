import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { calculateRank } from "../report-cards/calculation/common";

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async recomputeTopStudents(
    schoolId: string,
    termId?: string,
  ): Promise<{ updated: number }> {
    if (!termId) {
      const today = new Date();
      const activeTerms = await this.prisma.term.findMany({
        where: {
          academicYear: { schoolId, isCurrent: true },
          startDate: { lte: today },
          endDate: { gte: today },
        },
        select: { id: true },
      });
      if (activeTerms.length > 1) {
        let updated = 0;
        for (const t of activeTerms) {
          updated += (await this.recomputeTopStudents(schoolId, t.id)).updated;
        }
        return { updated };
      }
    }

    let term;
    if (termId) {
      term = await this.prisma.term.findUnique({ where: { id: termId } });
    } else {
      const today = new Date();
      term = await this.prisma.term.findFirst({
        where: {
          academicYear: { schoolId, isCurrent: true },
          startDate: { lte: today },
          endDate: { gte: today },
        },
        orderBy: { orderIndex: "asc" },
      });
    }

    if (!term) {
      this.logger.warn(`Aucun trimestre actif pour l'ecole ${schoolId}. Recalcul ignore.`);
      return { updated: 0 };
    }

    const reportCards = await this.prisma.reportCard.findMany({
      where: {
        termId: term.id,
        status: "PUBLISHED",
        isComplete: true,
        student: { schoolId },
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
        class: { select: { id: true, name: true, level: { select: { cycle: true, name: true } } } },
      },
    });

    if (reportCards.length === 0) {
      this.logger.log(`Aucun bulletin publie pour le term ${term.id}. Recalcul ignore.`);
      return { updated: 0 };
    }

    const byCycle: Record<string, typeof reportCards> = {
      PREMIER_CYCLE: [],
      DEUXIEME_CYCLE: [],
      LYCEE: [],
    };

    for (const rc of reportCards) {
      const cycle = rc.class.level?.cycle;
      if (cycle && byCycle[cycle] && rc.average !== null) {
        byCycle[cycle].push(rc);
      }
    }

    const termYear = await this.prisma.academicYear.findUnique({
      where: { id: term.academicYearId },
      select: { label: true },
    });
    const periodLabel = `${term.name} - ${termYear?.label ?? ""}`.trim();
    const periodType =
      term.type === "MOIS" ? "MOIS" : term.type === "TRIMESTRE" ? "TRIMESTRE" : "SEMESTRE";

    let totalUpdated = 0;

    for (const [cycle, cards] of Object.entries(byCycle)) {
      if (cards.length === 0) continue;

      const byStudent = new Map<string, typeof cards[number]>();
      for (const rc of cards) {
        const existing = byStudent.get(rc.studentId);
        if (!existing || Number(rc.average) > Number(existing.average)) {
          byStudent.set(rc.studentId, rc);
        }
      }
      const deduped = Array.from(byStudent.values());

      const sorted = [...deduped].sort((a, b) => {
        const diff = Number(b.average ?? 0) - Number(a.average ?? 0);
        if (diff !== 0) return diff;
        const nameA = `${a.student.lastName} ${a.student.firstName}`;
        const nameB = `${b.student.lastName} ${b.student.firstName}`;
        return nameA.localeCompare(nameB, "fr");
      });

      const allAverages = sorted.map((rc) => Number(rc.average));
      const top3 = sorted.slice(0, 3);

      await this.prisma.$transaction([
        this.prisma.topStudent.deleteMany({ where: { schoolId, cycle, periodLabel } }),
        ...top3.map((rc) =>
          this.prisma.topStudent.create({
            data: {
              schoolId,
              cycle,
              periodType,
              periodLabel,
              termId: term.id,
              rank: calculateRank(Number(rc.average), allAverages),
              studentId: rc.studentId,
              classId: rc.classId,
              average: rc.average as any,
              scale: rc.scale ?? 20,
            },
          }),
        ),
      ]);
      totalUpdated += top3.length;
    }

    this.logger.log(`Top students recalcule : ${totalUpdated} eleves mis a jour (term ${term.id})`);
    return { updated: totalUpdated };
  }

  async getHonorRoll(schoolId: string, termId?: string, cycleFilter?: string) {
    const data = await this.settings.getDataWithDefaults(schoolId);
    const topN = Math.max(1, Number(data?.honorRoll?.topN ?? 3));

    const terms = termId
      ? await this.prisma.term.findMany({ where: { id: termId } })
      : await this.prisma.term.findMany({ where: { academicYear: { schoolId, isCurrent: true } } });

    const emptyPodiums = (): Record<string, any[]> => ({
      PREMIER_CYCLE: [], DEUXIEME_CYCLE: [], LYCEE: [],
    });
    if (terms.length === 0) {
      return { topN, term: null, podiums: emptyPodiums() };
    }

    const cycles = cycleFilter
      ? [cycleFilter]
      : ["PREMIER_CYCLE", "DEUXIEME_CYCLE", "LYCEE"];

    const podiums = emptyPodiums();

    for (const cycle of cycles) {
      const classes = await this.prisma.class.findMany({
        where: { schoolId, level: { cycle: cycle as any } },
        include: { level: { select: { cycle: true, name: true } } },
      });
      if (classes.length === 0) continue;

      const byClass: any[] = [];
      for (const cls of classes) {
        const agg = await this.prisma.reportCard.aggregate({
          where: {
            classId: cls.id,
            termId: { in: terms.map((t) => t.id) },
            status: "PUBLISHED",
            average: { not: null },
          },
          _avg: { average: true },
          _count: { _all: true },
        });
        if (!agg._count._all || agg._avg.average === null) continue;
        byClass.push({
          classId: cls.id,
          className: cls.name,
          levelName: cls.level?.name ?? null,
          average: Number(agg._avg.average),
          studentsCount: agg._count._all,
          scale: 20,
        });
      }
      if (byClass.length === 0) continue;

      byClass.sort((a, b) => b.average - a.average || a.className.localeCompare(b.className, "fr"));
      let lastAvg: number | null = null;
      let lastRank = 0;
      byClass.forEach((c, i) => {
        const isTie = lastAvg !== null && Math.abs(c.average - lastAvg) < 0.01;
        c.rank = isTie ? lastRank : i + 1;
        lastAvg = c.average;
        lastRank = c.rank;
      });

      const scaleForCycle = cycle === "PREMIER_CYCLE" ? 10 : 20;
      podiums[cycle] = byClass
        .filter((c) => c.rank <= topN)
        .map((c) => ({ ...c, scale: scaleForCycle }));
    }

    return { topN, term: terms[0] ?? null, podiums };
  }

  async getTopStudents(schoolId: string, termId?: string) {
    type Period = { termId: string; name: string; type: string };
    const emptyPodiums = (): Record<string, any[]> => ({ PREMIER_CYCLE: [], DEUXIEME_CYCLE: [], LYCEE: [] });

    const terms = termId
      ? await this.prisma.term.findMany({ where: { id: termId } })
      : await this.prisma.term.findMany({ where: { academicYear: { schoolId, isCurrent: true } } });

    if (terms.length === 0) {
      return { term: null, periods: {} as Record<string, Period | null>, podiums: emptyPodiums() };
    }
    const termById = new Map(terms.map((t) => [t.id, t]));

    const rows = await this.prisma.topStudent.findMany({
      where: { schoolId, termId: { in: terms.map((t) => t.id) } },
      orderBy: [{ cycle: "asc" }, { rank: "asc" }],
      include: {
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
        class: { select: { id: true, name: true } },
      },
    });

    const podiums = emptyPodiums();
    const periods: Record<string, Period | null> = { PREMIER_CYCLE: null, DEUXIEME_CYCLE: null, LYCEE: null };
    let latest: (typeof terms)[number] | null = null;

    for (const cycle of Object.keys(podiums)) {
      const cycleRows = rows.filter((r) => r.cycle === cycle && r.termId && termById.has(r.termId));
      if (cycleRows.length === 0) continue;

      let best = termById.get(cycleRows[0].termId as string)!;
      for (const r of cycleRows) {
        const t = termById.get(r.termId as string)!;
        if (t.endDate.getTime() > best.endDate.getTime()) best = t;
      }
      const filteredRows = cycleRows.filter((r) => r.termId === best.id);
      const classIdsForCycle = Array.from(new Set(filteredRows.map((r) => r.classId)));

      const classCounts = await this.prisma.reportCard.groupBy({
        by: ["classId"],
        where: { classId: { in: classIdsForCycle }, termId: best.id, status: "PUBLISHED", student: { schoolId } },
        _count: { _all: true },
      });
      const studentsCountByClass = new Map(classCounts.map((c) => [c.classId, c._count._all]));

      const enrollCounts = await this.prisma.enrollment.groupBy({
        by: ["classId"],
        where: { classId: { in: classIdsForCycle }, academicYearId: best.academicYearId, status: "VALIDATED" },
        _count: { _all: true },
      });
      const classSizeByClass = new Map(enrollCounts.map((c) => [c.classId, c._count._all]));

      podiums[cycle] = filteredRows.map((row) => ({
        rank: row.rank,
        average: Number(row.average),
        scale: row.scale,
        student: row.student,
        class: row.class,
        classSize: classSizeByClass.get(row.classId) ?? null,
        studentsCount: studentsCountByClass.get(row.classId) ?? null,
      }));
      periods[cycle] = { termId: best.id, name: best.name, type: best.type };
      if (!latest || best.endDate.getTime() > latest.endDate.getTime()) latest = best;
    }

    return {
      term: latest
        ? { id: latest.id, name: latest.name, type: latest.type, startDate: latest.startDate, endDate: latest.endDate }
        : null,
      periods,
      podiums,
    };
  }

  async getTeacherDashboard(userId: string, schoolId: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { userId, schoolId } });

    if (!teacher) {
      return { hasProfile: false, message: "Aucun profil enseignant associe" };
    }

    const year = await this.prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });

    const assignments = year
      ? await this.prisma.teacherAssignment.findMany({
          where: { teacherId: teacher.id, academicYearId: year.id },
          include: {
            class: {
              select: {
                id: true,
                name: true,
                level: { select: { id: true, name: true, cycle: true } },
                _count: { select: { enrollments: true } },
              },
            },
            subject: { select: { id: true, name: true, code: true } },
          },
        })
      : [];

    const classesMap = new Map<string, any>();
    for (const a of assignments) {
      if (!classesMap.has(a.classId)) {
        classesMap.set(a.classId, {
          id: a.class.id,
          name: a.class.name,
          level: a.class.level,
          studentCount: a.class._count.enrollments,
        });
      }
    }
    const myClasses = Array.from(classesMap.values());

    const subjectsMap = new Map<string, any>();

    if (teacher.teacherType === "GENERALIST") {
      const classIds = Array.from(classesMap.keys());
      if (classIds.length > 0) {
        const classSubjects = await this.prisma.classSubject.findMany({
          where: {
            classId: { in: classIds },
            isActive: true,
            ...(year ? { academicYearId: year.id } : {}),
          },
          include: { subject: { select: { id: true, name: true, code: true } } },
        });
        for (const cs of classSubjects) {
          if (!subjectsMap.has(cs.subject.id)) {
            subjectsMap.set(cs.subject.id, cs.subject);
          }
        }
      }
    } else {
      for (const a of assignments) {
        if (a.subjectId && a.subject && !subjectsMap.has(a.subjectId)) {
          subjectsMap.set(a.subjectId, a.subject);
        }
      }
    }
    const mySubjects = Array.from(subjectsMap.values());
    const isGeneralist = teacher.teacherType === "GENERALIST";

    const totalStudents = myClasses.reduce((sum, c) => sum + (c.studentCount || 0), 0);

    const today = new Date();
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const upcomingAssessments = await this.prisma.assessment.findMany({
      where: { teacherId: teacher.id, schoolId, date: { gte: today, lte: in7Days } },
      orderBy: { date: "asc" },
      take: 10,
      include: { class: { select: { name: true } }, subject: { select: { name: true } } },
    });

    const pendingAssessments = await this.prisma.assessment.findMany({
      where: { teacherId: teacher.id, schoolId, status: { in: ["DRAFT", "OPEN"] } },
      orderBy: { date: "desc" },
      take: 10,
      include: { class: { select: { name: true } }, subject: { select: { name: true } }, _count: { select: { grades: true } } },
    });

    return {
      hasProfile: true,
      teacher: { id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName, matricule: teacher.matricule },
      isGeneralist,
      myClasses,
      mySubjects,
      totalStudents,
      upcomingAssessments,
      pendingAssessments,
    };
  }

  async getSupervisorDashboard(schoolId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = await this.prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });

    const todaySessions = year
      ? await this.prisma.attendanceSession.count({
          where: { date: today, class: { academicYearId: year.id, schoolId } },
        })
      : 0;

    const absents = await this.prisma.attendanceRecord.findMany({
      where: { status: "ABSENT", session: { date: today, class: { schoolId } } },
      include: {
        student: {
          select: {
            id: true, firstName: true, lastName: true, matricule: true,
            guardians: {
              select: { guardian: { select: { id: true, firstName: true, lastName: true, phone: true, relationType: true } } },
            },
          },
        },
        session: { select: { class: { select: { name: true } }, startTime: true } },
      },
      take: 20,
    });

    return { todaySessions, absentsCount: absents.length, absents };
  }

  async getSecretaryDashboard(schoolId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEnrollments = await this.prisma.enrollment.count({
      where: { student: { schoolId }, enrollmentDate: { gte: today } },
    });

    const recentStudents = await this.prisma.student.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, firstName: true, lastName: true, matricule: true, createdAt: true },
    });

    const totalStudents = await this.prisma.student.count({ where: { schoolId, status: "ACTIVE" } });

    return { todayEnrollments, totalStudents, recentStudents };
  }

  async getEnrollmentByClass(schoolId: string) {
    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true, label: true },
    });

    if (!currentYear) return { academicYear: null, classes: [] };

    const classes = await this.prisma.class.findMany({
      where: { schoolId, academicYearId: currentYear.id, status: "OPEN" },
      select: {
        id: true,
        name: true,
        level: { select: { name: true, cycle: true } },
        enrollments: {
          where: { status: "VALIDATED" },
          select: { student: { select: { gender: true, status: true, deletedAt: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    return {
      academicYear: currentYear.label,
      classes: classes.map((c) => {
        const activeStudents = c.enrollments.map((e) => e.student).filter((s) => s.status === "ACTIVE" && !s.deletedAt);
        const boys = activeStudents.filter((s) => s.gender === "M").length;
        const girls = activeStudents.filter((s) => s.gender === "F").length;
        return {
          classId: c.id,
          className: c.name,
          levelName: c.level?.name ?? null,
          cycle: c.level?.cycle ?? null,
          boys, girls, total: boys + girls,
        };
      }),
    };
  }

  async getClassesDistribution(schoolId: string) {
    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
    });

    if (!currentYear) return { total: 0, levels: [] };

    const classes = await this.prisma.class.findMany({
      where: { schoolId, academicYearId: currentYear.id, status: "OPEN" },
      select: { id: true, level: { select: { id: true, name: true, cycle: true, orderIndex: true } } },
    });

    const map = new Map<string, { levelId: string; levelName: string; cycle: string; orderIndex: number; count: number }>();

    for (const c of classes) {
      if (!c.level) continue;
      const key = c.level.id;
      if (!map.has(key)) {
        map.set(key, {
          levelId: c.level.id, levelName: c.level.name, cycle: c.level.cycle, orderIndex: c.level.orderIndex, count: 0,
        });
      }
      map.get(key)!.count += 1;
    }

    const levels = Array.from(map.values()).sort((a, b) => a.orderIndex - b.orderIndex);
    return { total: classes.length, levels };
  }

  async getRecentReportCards(schoolId: string, limit = 5) {
    const data = await this.prisma.reportCard.findMany({
      where: { student: { schoolId, deletedAt: null } },
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, status: true, average: true, scale: true, createdAt: true, updatedAt: true,
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
        class: { select: { id: true, name: true } },
        term: { select: { id: true, name: true, type: true } },
      },
    });
    return { data };
  }

  async getRecentActivities(schoolId: string, limit = 10) {
    const ACTIVITY_LABELS: Record<string, string> = {
      "report-card.create": "Nouveau bulletin créé",
      "report-card.validate": "Bulletin validé",
      "report-card.publish": "Bulletin publié",
      "teacher.create": "Nouvel enseignant ajouté",
      "teacher.update": "Enseignant modifié",
      "assignment.create": "Affectation matière-classe ajoutée",
      "assignment.update": "Affectation matière-classe modifiée",
      "payment.create": "Paiement enregistré",
      "payment.cancel": "Paiement annulé",
      "grade.create": "Note saisie",
      "grade.update": "Note modifiée",
      "assessment.create": "Évaluation créée",
      "student.create": "Nouvel élève inscrit",
      "class.create": "Nouvelle classe créée",
      "invoice.create": "Facture créée",
    };

    const logs = await this.prisma.auditLog.findMany({
      where: { schoolId, action: { in: Object.keys(ACTIVITY_LABELS) } },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: { id: true, action: true, module: true, objectType: true, objectId: true, createdAt: true, userId: true, newValue: true },
    });

    return {
      data: logs.map((l) => ({
        id: l.id,
        action: l.action,
        label: ACTIVITY_LABELS[l.action] ?? l.action,
        module: l.module,
        objectType: l.objectType,
        objectId: l.objectId,
        userId: l.userId,
        createdAt: l.createdAt,
        title: (l.newValue as any)?.label ?? (l.newValue as any)?.name ?? (l.newValue as any)?.reference ?? null,
      })),
    };
  }

  // ============================================================
  // LOT 3 — Répartition des notes par matière
  // ============================================================

  async getGradesBySubject(
    schoolId: string,
    classId: string,
    termId?: string,
  ) {
    const klass = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: {
        id: true,
        name: true,
        academicYearId: true,
        level: { select: { id: true, name: true, cycle: true } },
      },
    });

    if (!klass) {
      return { class: null, term: null, scale: null, subjects: [], message: "Classe introuvable" };
    }

    let term;
    if (termId) {
      term = await this.prisma.term.findUnique({ where: { id: termId } });
    } else {
      const today = new Date();
      term = await this.prisma.term.findFirst({
        where: {
          academicYearId: klass.academicYearId,
          startDate: { lte: today },
          endDate: { gte: today },
        },
        orderBy: { orderIndex: "asc" },
      });
    }

    if (!term) {
      return { class: klass, term: null, scale: null, subjects: [], message: "Aucun trimestre actif" };
    }

    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        classId: klass.id,
        academicYearId: klass.academicYearId,
        isActive: true,
      },
      include: { subject: { select: { id: true, code: true, name: true } } },
      orderBy: { displayOrder: "asc" },
    });

    if (classSubjects.length === 0) {
      return { class: klass, term, scale: null, subjects: [], message: "Aucune matière configurée pour cette classe" };
    }

    const scale = classSubjects[0].scale;

    const subjectsWithAverages = await Promise.all(
      classSubjects.map(async (cs) => {
        const grades = await this.prisma.grade.findMany({
          where: {
            assessment: {
              classId: klass.id,
              subjectId: cs.subjectId,
              termId: term!.id,
            },
            value: { not: null },
            isAbsent: false,
          },
          select: { value: true, assessment: { select: { maxScore: true } } },
        });

        if (grades.length === 0) {
          return {
            subjectId: cs.subject.id,
            subjectName: cs.subject.name,
            subjectCode: cs.subject.code,
            average: null,
            gradesCount: 0,
            scale,
          };
        }

        let sum = 0;
        let count = 0;
        for (const g of grades) {
          if (g.value === null) continue;
          const rawValue = Number(g.value);
          const maxScore = Number(g.assessment.maxScore ?? scale);
          const normalized = (rawValue / maxScore) * scale;
          sum += normalized;
          count++;
        }

        const average = count > 0 ? sum / count : null;

        return {
          subjectId: cs.subject.id,
          subjectName: cs.subject.name,
          subjectCode: cs.subject.code,
          average: average !== null ? Math.round(average * 100) / 100 : null,
          gradesCount: count,
          scale,
        };
      }),
    );

    return {
      class: klass,
      term: { id: term.id, name: term.name, type: term.type },
      scale,
      subjects: subjectsWithAverages,
    };
  }

  private async getYearLabel(schoolId: string): Promise<string | null> {
    const year = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { label: true },
    });
    return year?.label ?? null;
  }
}