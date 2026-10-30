import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ReportCardsService } from "../report-cards/report-cards.service";
import { GradesBulkDto, GradeUpdateDto } from "./dto";
import { calculateWeightedAverage } from "@sis-mali/shared";


/**
 * Source unique de verite : `status`.
 * `isAbsent` et `isExempt` sont derives de `status` (retrocompat).
 */
function deriveStatusFlags(
  status?: string | null,
  isAbsent?: boolean | null,
  isExempt?: boolean | null,
): { status: string; isAbsent: boolean; isExempt: boolean } {
  let finalStatus = status;
  if (!finalStatus) {
    if (isExempt) finalStatus = "EXEMPT";
    else if (isAbsent) finalStatus = "ABSENT";
    else finalStatus = "PRESENT";
  }
  return {
    status: finalStatus,
    isAbsent: finalStatus === "ABSENT",
    isExempt: finalStatus === "EXEMPT",
  };
}

@Injectable()
export class GradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportCards: ReportCardsService,
  ) {}

  async findByAssessment(assessmentId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    if (!assessment) throw new NotFoundException("Evaluation introuvable");

    // Recuperer tous les eleves inscrits dans la classe
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        classId: assessment.classId,
        academicYearId: assessment.academicYearId,
        status: "VALIDATED",
      },
      include: {
        student: {
          select: {
            id: true, matricule: true, firstName: true, lastName: true, gender: true,
          },
        },
      },
      orderBy: { student: { lastName: "asc" } },
    });

    const grades = await this.prisma.grade.findMany({
      where: { assessmentId },
    });

    const gradesByStudent = new Map(grades.map((g) => [g.studentId, g]));

    return {
      assessment,
      grades: enrollments.map((e) => {
        const grade = gradesByStudent.get(e.studentId);
        return {
          studentId: e.studentId,
          student: e.student,
          grade: grade
            ? {
                id: grade.id,
                value: grade.value,
                isAbsent: grade.isAbsent,
                observation: grade.observation,
                locked: grade.locked,
              }
            : null,
        };
      }),
    };
  }

  async bulkEntry(dto: GradesBulkDto, user: { id: string; roles: string[]; schoolId?: string | null }) {
    await this.assertCanGrade(dto.assessmentId, user);
    const enteredBy = user.id;
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: dto.assessmentId },
    });
    if (!assessment) throw new NotFoundException("Evaluation introuvable");

    if (assessment.status === "LOCKED" || assessment.status === "VALIDATED") {
      throw new BadRequestException("Cette evaluation est verrouillee ou validee");
    }

    // Verifier les plages
    for (const g of dto.grades) {
      if (g.value !== null && (g.value < 0 || g.value > Number(assessment.maxScore))) {
        throw new BadRequestException(
          `Note hors plage pour l eleve ${g.studentId}: ${g.value} (max ${assessment.maxScore})`,
        );
      }
    }

    // Recuperer les anciennes notes AVANT le upsert (pour audit)
    const studentIds = dto.grades.map((g) => g.studentId);
    const existingGrades = await this.prisma.grade.findMany({
      where: { assessmentId: dto.assessmentId, studentId: { in: studentIds } },
      select: { id: true, studentId: true, value: true },
    });
    const oldByStudent = new Map(existingGrades.map((g) => [g.studentId, g]));

    // Upsert toutes les notes
    const results = await this.prisma.$transaction(
      dto.grades.map((g) =>
        this.prisma.grade.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId: dto.assessmentId,
              studentId: g.studentId,
            },
          },
          update: (() => {
            const flags = deriveStatusFlags(g.status, g.isAbsent, g.isExempt);
            return {
              value: g.value,
              status: flags.status as any,
              isAbsent: flags.isAbsent,
              isExempt: flags.isExempt,
              observation: g.observation,
              comment: g.comment,
              enteredBy,
            };
          })(),
          create: (() => {
            const flags = deriveStatusFlags(g.status, g.isAbsent, g.isExempt);
            return {
              assessmentId: dto.assessmentId,
              studentId: g.studentId,
              value: g.value,
              status: flags.status as any,
              isAbsent: flags.isAbsent,
              isExempt: flags.isExempt,
              observation: g.observation,
              comment: g.comment,
              enteredBy,
            };
          })(),
        }),
      ),
    );

    // Journal GradeAudit : si une note existait deja et que la valeur a change
    const auditsToCreate: any[] = [];
    for (const g of dto.grades) {
      const old = oldByStudent.get(g.studentId);
      if (old && old.value !== null && g.value !== null) {
        const oldVal = Number(old.value);
        const newVal = Number(g.value);
        if (oldVal !== newVal) {
          auditsToCreate.push({
            gradeId: old.id,
            oldValue: old.value,
            newValue: g.value,
            userId: user.id,
            motive: "Modification en masse (bulkEntry)",
          });
        }
      }
    }

    if (auditsToCreate.length > 0) {
      await this.prisma.gradeAudit.createMany({ data: auditsToCreate });
    }

    // L8 : recalculer isComplete après modification
    try {
      await this.reportCards.recomputeIsCompleteForAssessment(dto.assessmentId);
    } catch (err) {
      // Silencieux : le recalcul ne doit pas bloquer la saisie
    }

    // DEC-9 : marquer les bulletins comme "à recalculer" (non publiés uniquement)
    try {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: dto.assessmentId },
        select: { classId: true, termId: true },
      });
      if (assessment) {
        await this.prisma.reportCard.updateMany({
          where: {
            classId: assessment.classId,
            termId: assessment.termId,
            status: { not: "PUBLISHED" },
          },
          data: { isStale: true },
        });
      }
    } catch (err) {
      // Silencieux
    }

    return { updated: results.length, grades: results, audited: auditsToCreate.length };
  }

  async update(id: string, dto: GradeUpdateDto, user: { id: string; roles: string[]; schoolId?: string | null }) {
    // Verifier le droit sur l'evaluation de cette note
    const gradeRef = await this.prisma.grade.findUnique({
      where: { id },
      select: { assessmentId: true },
    });
    if (!gradeRef) throw new NotFoundException("Note introuvable");
    await this.assertCanGrade(gradeRef.assessmentId, user);
    const updatedBy = user.id;
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: { assessment: true },
    });
    if (!grade) throw new NotFoundException("Note introuvable");

    if (grade.locked) {
      throw new BadRequestException("Cette note est verrouillee et ne peut plus etre modifiee");
    }

    if (dto.value !== undefined && dto.value !== null) {
      if (dto.value < 0 || dto.value > Number(grade.assessment.maxScore)) {
        throw new BadRequestException(`Note hors plage (max ${grade.assessment.maxScore})`);
      }
    }

    const oldValue = grade.value;
    // Synchroniser status / isAbsent / isExempt
    const flags = deriveStatusFlags(dto.status, dto.isAbsent, dto.isExempt);
    const updated = await this.prisma.grade.update({
      where: { id },
      data: {
        value: dto.value,
        status: flags.status as any,
        isAbsent: flags.isAbsent,
        isExempt: flags.isExempt,
        observation: dto.observation,
        comment: dto.comment,
        enteredBy: updatedBy,
      },
    });

    // Journal GradeAudit si value a changé
    const valueChanged =
      dto.value !== undefined &&
      (oldValue === null || updated.value === null
        ? oldValue !== updated.value
        : Number(oldValue) !== Number(updated.value));
    if (valueChanged) {
      await this.prisma.gradeAudit.create({
        data: {
          gradeId: id,
          oldValue: oldValue,
          newValue: updated.value,
          userId: user.id,
          motive: "Modification manuelle",
        },
      });
    }

    // L8 : recalculer isComplete après modification
    try {
      await this.reportCards.recomputeIsCompleteForAssessment(grade.assessmentId);
    } catch (err) {
      // Silencieux
    }

    // DEC-9 : marquer les bulletins comme "à recalculer" (non publiés uniquement)
    try {
      await this.prisma.reportCard.updateMany({
        where: {
          classId: grade.assessment.classId,
          termId: grade.assessment.termId,
          status: { not: "PUBLISHED" },
        },
        data: { isStale: true },
      });
    } catch (err) {
      // Silencieux
    }

    return updated;
  }

  /**
   * Calcule la moyenne d'un eleve pour une matiere et un trimestre.
   */
  async getStudentSubjectAverage(studentId: string, subjectId: string, termId: string) {
    const assessments = await this.prisma.assessment.findMany({
      where: {
        subjectId,
        termId,
        grades: { some: { studentId } },
      },
      include: {
        grades: { where: { studentId } },
      },
    });

    const gradesWithCoeff = assessments
      .filter((a) => a.grades.length > 0 && a.grades[0].value !== null)
      .map((a) => ({
        value: Number(a.grades[0].value),
        coefficient: Number(a.coefficient),
      }));

    const average = calculateWeightedAverage(gradesWithCoeff);
    return {
      studentId,
      subjectId,
      termId,
      assessmentsCount: gradesWithCoeff.length,
      average,
    };
  }

  /**
   * Statistiques d'une evaluation (meilleure note, plus faible, moyenne classe)
   */
  async getAssessmentStats(assessmentId: string) {
    const grades = await this.prisma.grade.findMany({
      where: { assessmentId, value: { not: null } },
    });

    if (grades.length === 0) {
      return { count: 0, average: null, min: null, max: null };
    }

    const values = grades.map((g) => Number(g.value));
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      average: Math.round((sum / values.length) * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  async remove(id: string, user: { id: string; roles: string[]; schoolId?: string | null }) {
    const gradeRef = await this.prisma.grade.findUnique({
      where: { id },
      select: { assessmentId: true },
    });
    if (!gradeRef) throw new NotFoundException("Note introuvable");
    await this.assertCanGrade(gradeRef.assessmentId, user);
    const grade = await this.prisma.grade.findUnique({ where: { id } });
    if (!grade) throw new NotFoundException("Note introuvable");
    if (grade.locked) throw new BadRequestException("Note verrouillee");
    return this.prisma.grade.delete({ where: { id } });
  }

  /**
   * Verifie que l'utilisateur a le droit de noter cette evaluation.
   * - SUPER_ADMIN, DIRECTOR, SECRETARY : toujours autorises (mais dans leur ecole)
   * - TEACHER : doit avoir une assignation (TeacherAssignment) sur la classe/matiere
   * - Autres : refuses
   */
  private async assertCanGrade(
    assessmentId: string,
    user: { id: string; roles: string[]; schoolId?: string | null },
  ) {
    // Verifier que l'evaluation n'est pas deja validee ou verrouillee
    const assessmentStatus = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { status: true, schoolId: true },
    });
    if (!assessmentStatus) throw new NotFoundException("Evaluation introuvable");
    if (assessmentStatus.status === "VALIDATED" || assessmentStatus.status === "LOCKED") {
      throw new BadRequestException(
        "Cette evaluation est validee/verrouillee. Les notes ne peuvent plus etre modifiees.",
      );
    }

    // Isolation multi-tenant : refuser si l'evaluation appartient a une autre ecole
    if (user.schoolId && assessmentStatus.schoolId !== user.schoolId) {
      throw new ForbiddenException("Acces interdit : evaluation d'un autre etablissement");
    }

    // Les roles privilegies passent toujours
    const privileged = ["SUPER_ADMIN", "DIRECTOR", "SECRETARY"];
    if (user.roles.some((r) => privileged.includes(r))) return;

    // Pour les enseignants : verifier l'assignation
    if (!user.roles.includes("TEACHER")) {
      throw new BadRequestException("Vous n'avez pas le droit de noter");
    }

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { classId: true, subjectId: true, academicYearId: true },
    });
    if (!assessment) throw new NotFoundException("Evaluation introuvable");

    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!teacher) {
      throw new BadRequestException("Aucun profil enseignant associe a votre compte");
    }

    const assignment = await this.prisma.teacherAssignment.findFirst({
      where: {
        teacherId: teacher.id,
        classId: assessment.classId,
        subjectId: assessment.subjectId,
        academicYearId: assessment.academicYearId,
      },
    });
    if (!assignment) {
      throw new BadRequestException(
        "Vous n'etes pas assigne a cette classe/matiere pour cette annee",
      );
    }
  }
}