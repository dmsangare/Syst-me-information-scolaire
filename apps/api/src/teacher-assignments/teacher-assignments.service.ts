import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TeacherAssignmentCreateDto, BulkAssignmentDto } from "./dto";
import { CurrentUserPayload } from "../common/decorators";
import { assertSchoolAccess, isSuperAdmin } from "../common/utils";

@Injectable()
export class TeacherAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifie qu'une ressource (teacher, class, subject, academicYear)
   * appartient bien a l'ecole de l'utilisateur.
   */
  private async assertResourceBelongsToSchool(
    user: CurrentUserPayload,
    resourceType: "teacher" | "class" | "subject" | "academicYear",
    resourceId: string,
  ): Promise<void> {
    if (isSuperAdmin(user)) return;

    let schoolId: string | null | undefined = null;

    switch (resourceType) {
      case "teacher": {
        const t = await this.prisma.teacher.findUnique({
          where: { id: resourceId },
          select: { schoolId: true },
        });
        if (!t) throw new NotFoundException("Enseignant introuvable");
        schoolId = t.schoolId;
        break;
      }
      case "class": {
        const c = await this.prisma.class.findUnique({
          where: { id: resourceId },
          select: { schoolId: true },
        });
        if (!c) throw new NotFoundException("Classe introuvable");
        schoolId = c.schoolId;
        break;
      }
      case "subject": {
        const s = await this.prisma.subject.findUnique({
          where: { id: resourceId },
          select: { schoolId: true },
        });
        if (!s) throw new NotFoundException("Matiere introuvable");
        schoolId = s.schoolId;
        break;
      }
      case "academicYear": {
        const y = await this.prisma.academicYear.findUnique({
          where: { id: resourceId },
          select: { schoolId: true },
        });
        if (!y) throw new NotFoundException("Annee scolaire introuvable");
        schoolId = y.schoolId;
        break;
      }
    }

    assertSchoolAccess(user, schoolId, "Ressource introuvable");
  }

  async findAll(
    user: CurrentUserPayload,
    teacherId?: string,
    classId?: string,
    subjectId?: string,
    academicYearId?: string,
  ) {
    const where: any = {};
    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;
    if (academicYearId) where.academicYearId = academicYearId;

    // Filtrage par ecole : on restreint via la relation teacher.schoolId
    if (!isSuperAdmin(user) && user.schoolId) {
      where.teacher = { schoolId: user.schoolId };
    }

    return this.prisma.teacherAssignment.findMany({
      where,
      orderBy: [{ class: { code: "asc" } }, { subject: { name: "asc" } }],
      include: {
        teacher: { select: { id: true, matricule: true, firstName: true, lastName: true } },
        subject: { select: { id: true, code: true, name: true } },
        class: { select: { id: true, code: true, name: true } },
        academicYear: { select: { id: true, label: true } },
      },
    });
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const assignment = await this.prisma.teacherAssignment.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, schoolId: true } },
        subject: { select: { id: true, schoolId: true } },
        class: { select: { id: true, schoolId: true } },
        academicYear: { select: { id: true, schoolId: true } },
      },
    });
    if (!assignment) throw new NotFoundException("Affectation introuvable");

    // Verifier que l'affectation appartient bien a l'ecole de l'utilisateur
    if (!isSuperAdmin(user)) {
      const assignmentSchoolId = assignment.teacher?.schoolId;
      if (user.schoolId && assignmentSchoolId !== user.schoolId) {
        throw new NotFoundException("Affectation introuvable");
      }
    }

    return assignment;
  }

  async create(dto: TeacherAssignmentCreateDto, user: CurrentUserPayload) {
    // Verifier que toutes les ressources appartiennent a l'ecole de l'utilisateur
    await this.assertResourceBelongsToSchool(user, "teacher", dto.teacherId);
    await this.assertResourceBelongsToSchool(user, "subject", dto.subjectId);
    await this.assertResourceBelongsToSchool(user, "class", dto.classId);
    await this.assertResourceBelongsToSchool(user, "academicYear", dto.academicYearId);

    const existing = await this.prisma.teacherAssignment.findUnique({
      where: {
        teacherId_subjectId_classId_academicYearId: {
          teacherId: dto.teacherId,
          subjectId: dto.subjectId,
          classId: dto.classId,
          academicYearId: dto.academicYearId,
        },
      },
    });
    if (existing) {
      throw new ConflictException("Cette affectation existe deja");
    }

    return this.prisma.teacherAssignment.create({
      data: dto as any,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, code: true, name: true } },
        class: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async createBulk(dto: BulkAssignmentDto, user: CurrentUserPayload) {
    // Verifier l'enseignant et l'annee scolaire
    await this.assertResourceBelongsToSchool(user, "teacher", dto.teacherId);
    await this.assertResourceBelongsToSchool(user, "academicYear", dto.academicYearId);

    // Verifier chaque matiere et chaque classe
    for (const a of dto.assignments) {
      await this.assertResourceBelongsToSchool(user, "subject", a.subjectId);
      await this.assertResourceBelongsToSchool(user, "class", a.classId);
    }

    const created: any[] = [];
    const errors: any[] = [];

    for (const a of dto.assignments) {
      try {
        const existing = await this.prisma.teacherAssignment.findUnique({
          where: {
            teacherId_subjectId_classId_academicYearId: {
              teacherId: dto.teacherId,
              subjectId: a.subjectId,
              classId: a.classId,
              academicYearId: dto.academicYearId,
            },
          },
        });

        if (existing) {
          errors.push({ subjectId: a.subjectId, classId: a.classId, message: "Deja existante" });
          continue;
        }

        const result = await this.prisma.teacherAssignment.create({
          data: {
            teacherId: dto.teacherId,
            academicYearId: dto.academicYearId,
            subjectId: a.subjectId,
            classId: a.classId,
            isMain: a.isMain || false,
          },
        });
        created.push(result);
      } catch (err: any) {
        errors.push({ subjectId: a.subjectId, classId: a.classId, message: err.message });
      }
    }

    return { created: created.length, errors, results: created };
  }

  async remove(id: string, user: CurrentUserPayload) {
    await this.findOne(id, user);
    return this.prisma.teacherAssignment.delete({ where: { id } });
  }

  async removeBulk(teacherId: string, academicYearId: string, user: CurrentUserPayload) {
    // Verifier les ressources
    await this.assertResourceBelongsToSchool(user, "teacher", teacherId);
    await this.assertResourceBelongsToSchool(user, "academicYear", academicYearId);

    const result = await this.prisma.teacherAssignment.deleteMany({
      where: { teacherId, academicYearId },
    });
    return { deleted: result.count };
  }
}