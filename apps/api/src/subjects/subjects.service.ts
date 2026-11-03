import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SubjectCreateDto, SubjectUpdateDto } from "./dto";

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(schoolId: string | null, q?: string, type?: string) {
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;
    if (type) where.type = type;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
      ];
    }

    return this.prisma.subject.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: {
        coefficients: {
          include: { level: { select: { id: true, code: true, name: true } } },
        },
        _count: { select: { assignments: true, assessments: true } },
      },
    });
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        coefficients: {
          include: { level: true },
          orderBy: { level: { orderIndex: "asc" } },
        },
        _count: { select: { assignments: true, assessments: true } },
      },
    });
    if (!subject) throw new NotFoundException("Matiere introuvable");
    return subject;
  }

  async create(dto: SubjectCreateDto) {
    if (!dto.schoolId) {
      throw new ConflictException("schoolId requis pour crÃƒÂ©er une matiÃƒÂ¨re");
    }
    const existing = await this.prisma.subject.findUnique({
      where: { schoolId_code: { schoolId: dto.schoolId, code: dto.code } },
    });
    if (existing) throw new ConflictException("Une matiere avec ce code existe deja");

    return this.prisma.subject.create({
      data: {
        ...dto,
        type: (dto.type || "CORE") as any,
      } as any,
    });
  }

  async update(id: string, dto: SubjectUpdateDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.type) data.type = dto.type as any;
    return this.prisma.subject.update({ where: { id }, data });
  }

  async remove(id: string) {
    const subject = await this.findOne(id);

    // Verification exhaustive de TOUTES les dependances historiques
    const [
      teacherAssignments,
      assessments,
      reportCardItems,
      examSessions,
      attendanceSessions,
      classSubjects,
    ] = await Promise.all([
      this.prisma.teacherAssignment.count({ where: { subjectId: id } }),
      this.prisma.assessment.count({ where: { subjectId: id } }),
      this.prisma.reportCardItem.count({ where: { subjectId: id } }),
      this.prisma.examSession.count({ where: { subjectId: id } }),
      this.prisma.attendanceSession.count({ where: { subjectId: id } }),
      this.prisma.classSubject.count({ where: { subjectId: id } }),
    ]);

    const usageSummary = [
      teacherAssignments > 0 ? `${teacherAssignments} affectation(s) enseignant` : null,
      assessments > 0 ? `${assessments} evaluation(s)` : null,
      reportCardItems > 0 ? `${reportCardItems} ligne(s) de bulletin` : null,
      examSessions > 0 ? `${examSessions} session(s) d'examen` : null,
      attendanceSessions > 0 ? `${attendanceSessions} session(s) de presence` : null,
      classSubjects > 0 ? `${classSubjects} affectation(s) de classe` : null,
    ].filter(Boolean);

    if (usageSummary.length > 0) {
      throw new ConflictException(
        `Impossible de supprimer : cette matiere est utilisee (${usageSummary.join(", ")}). ` +
        `Utilisez PATCH /subjects/${id}/reactivate ou la desactivation (isActive=false).`,
      );
    }

    // Aucun usage : soft-delete systematique (jamais de delete physique)
    return this.prisma.subject.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async reactivate(id: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException("Matiere introuvable");
    if (subject.isActive) {
      throw new ConflictException("Cette matiere est deja active");
    }
    return this.prisma.subject.update({
      where: { id },
      data: { isActive: true },
    });
  }

  // ============================================================
  // Coefficients par niveau
  // ============================================================

  async getCoefficients(subjectId: string) {
    await this.findOne(subjectId);
    return this.prisma.subjectCoefficient.findMany({
      where: { subjectId },
      include: { level: true },
      orderBy: { level: { orderIndex: "asc" } },
    });
  }

  async setCoefficient(
    subjectId: string,
    levelId: string,
    academicYearId: string,
    coefficient: number,
    weeklyHours?: number,
    userId?: string,
  ) {
    await this.findOne(subjectId);

    // Verifier que le level appartient au 2e cycle
    const level = await this.prisma.level.findUnique({ where: { id: levelId } });
    if (!level) throw new NotFoundException("Niveau introuvable");
    if (level.cycle === "PREMIER_CYCLE") {
      throw new BadRequestException(
        "Le premier cycle (1ere a 6eme annee) n'autorise pas les coefficients.",
      );
    }

    // Chercher l'ancien coefficient (pour audit)
    const old = await this.prisma.subjectCoefficient.findUnique({
      where: {
        subjectId_levelId_academicYearId: { subjectId, levelId, academicYearId },
      },
    });

    // Determiner si un changement reel a eu lieu
    const oldCoef = old ? Number(old.coefficient) : null;
    const oldHours = old?.weeklyHours !== null && old?.weeklyHours !== undefined ? Number(old.weeklyHours) : null;
    const hasChanged = !old || oldCoef !== coefficient || oldHours !== (weeklyHours ?? null);

    // Transaction : upsert + audit atomiques
    return this.prisma.$transaction(async (tx) => {
      const upserted = await tx.subjectCoefficient.upsert({
        where: {
          subjectId_levelId_academicYearId: {
            subjectId,
            levelId,
            academicYearId,
          },
        },
        update: { coefficient, weeklyHours },
        create: { subjectId, levelId, academicYearId, coefficient, weeklyHours },
      });

      if (hasChanged && userId) {
        await tx.subjectCoefficientAudit.create({
          data: {
            coefficientId: upserted.id,
            subjectId,
            levelId,
            academicYearId,
            oldValue: oldCoef,
            newValue: coefficient,
            oldWeeklyHours: oldHours,
            newWeeklyHours: weeklyHours ?? null,
            operationType: old ? "UPDATE" : "CREATE",
            userId,
            motive: null,
          },
        });
      }

      return upserted;
    });
  }

  async removeCoefficient(
    subjectId: string,

    levelId: string,
    academicYearId: string,
    userId?: string,
  ) {
    await this.findOne(subjectId);

    const old = await this.prisma.subjectCoefficient.findUnique({
      where: {
        subjectId_levelId_academicYearId: { subjectId, levelId, academicYearId },
      },
    });

    if (!old) {
      throw new NotFoundException("Coefficient introuvable");
    }

    // Transaction : audit AVANT suppression (l'audit survit grace a onDelete: SetNull)
    await this.prisma.$transaction(async (tx) => {
      if (userId) {
        await tx.subjectCoefficientAudit.create({
          data: {
            coefficientId: old.id,
            subjectId,
            levelId,
            academicYearId,
            oldValue: Number(old.coefficient),
            newValue: null,
            oldWeeklyHours: old.weeklyHours !== null && old.weeklyHours !== undefined ? Number(old.weeklyHours) : null,
            newWeeklyHours: null,
            operationType: "DELETE",
            userId,
            motive: null,
          },
        });
      }

      await tx.subjectCoefficient.delete({
        where: {
          subjectId_levelId_academicYearId: { subjectId, levelId, academicYearId },
        },
      });
    });
  }

  async getCoefficientAudits(
    subjectId: string,
    levelId?: string,
    academicYearId?: string,
  ) {
    const where: any = { subjectId };
    if (levelId) where.levelId = levelId;
    if (academicYearId) where.academicYearId = academicYearId;

    return this.prisma.subjectCoefficientAudit.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async getCoefficientsByYear(subjectId: string, academicYearId?: string) {
    await this.findOne(subjectId);
    const where: any = { subjectId };
    if (academicYearId) where.academicYearId = academicYearId;
    return this.prisma.subjectCoefficient.findMany({
      where,
      include: {
        level: { select: { id: true, code: true, name: true, cycle: true } },
        academicYear: { select: { id: true, label: true, isCurrent: true } },
      },
      orderBy: [{ academicYear: { startDate: "desc" } }, { level: { orderIndex: "asc" } }],
    });
  }
}