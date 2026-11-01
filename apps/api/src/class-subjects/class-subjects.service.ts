import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  ClassSubjectCreateDto,
  ClassSubjectUpdateDto,
  ClassSubjectBulkCreateDto,
  ClassSubjectReorderDto,
} from "./dto";
import { CurrentUserPayload } from "../common/decorators";
import { isSuperAdmin } from "../common/utils";

@Injectable()
export class ClassSubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // LECTURE
  // ============================================================

  async findAll(
    user: CurrentUserPayload,
    filters: { classId?: string; academicYearId?: string; subjectId?: string; isActive?: boolean } = {},
  ) {
    const where: any = {};

    // Cloisonnement schoolId via la classe
    if (!isSuperAdmin(user)) {
      where.class = { schoolId: user.schoolId };
    }
    if (filters.classId) where.classId = filters.classId;
    if (filters.academicYearId) where.academicYearId = filters.academicYearId;
    if (filters.subjectId) where.subjectId = filters.subjectId;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    return this.prisma.classSubject.findMany({
      where,
      orderBy: [
        { classId: "asc" },
        { displayOrder: "asc" },
        { subject: { name: "asc" } },
      ],
      include: {
        class: { select: { id: true, code: true, name: true, levelId: true } },
        subject: { select: { id: true, code: true, name: true, type: true } },
        academicYear: { select: { id: true, label: true, isCurrent: true } },
      },
    });
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const item = await this.prisma.classSubject.findUnique({
      where: { id },
      include: {
        class: true,
        subject: true,
        academicYear: true,
      },
    });
    if (!item) throw new NotFoundException("Affectation introuvable");

    if (!isSuperAdmin(user) && item.class.schoolId !== user.schoolId) {
      throw new NotFoundException("Affectation introuvable");
    }
    return item;
  }

  // ============================================================
  // CREATION
  // ============================================================

  async create(dto: ClassSubjectCreateDto, user: CurrentUserPayload) {
    // 1. Charger la classe et la matiere
    const [cls, subject] = await Promise.all([
      this.prisma.class.findUnique({
        where: { id: dto.classId },
        include: { level: true },
      }),
      this.prisma.subject.findUnique({ where: { id: dto.subjectId } }),
    ]);
    if (!cls) throw new NotFoundException("Classe introuvable");
    if (!subject) throw new NotFoundException("Matiere introuvable");

    // 2. Cloisonnement schoolId
    if (cls.schoolId !== subject.schoolId) {
      throw new ForbiddenException("La classe et la matiere appartiennent a des etablissements differents");
    }
    if (!isSuperAdmin(user) && cls.schoolId !== user.schoolId) {
      throw new ForbiddenException("Acces refuse a cette classe");
    }

    // 3. Coherence annee scolaire
    if (cls.academicYearId !== dto.academicYearId) {
      throw new BadRequestException(
        "L'annee scolaire de l'affectation doit correspondre a celle de la classe",
      );
    }

    // 4. Coherence echelle / cycle
    this.validateScaleForCycle(dto.scale, cls.level.cycle);

    // 5. Anti-doublon applicatif (avant la contrainte DB, pour un message clair)
    const existing = await this.prisma.classSubject.findUnique({
      where: {
        classId_subjectId_academicYearId: {
          classId: dto.classId,
          subjectId: dto.subjectId,
          academicYearId: dto.academicYearId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        "Cette matiere est deja affectee a cette classe pour cette annee scolaire",
      );
    }

    // 6. Regles pedagogiques : pas de coefficient au 1er cycle
    if (cls.level.cycle === "PREMIER_CYCLE") {
      const hasCoeff = await this.prisma.subjectCoefficient.count({
        where: {
          subjectId: dto.subjectId,
          levelId: cls.levelId,
          academicYearId: dto.academicYearId,
        },
      });
      if (hasCoeff > 0) {
        throw new BadRequestException(
          "Le premier cycle n'autorise pas les coefficients. Supprimez d'abord le coefficient existant.",
        );
      }
    }

    // 7. Regles pedagogiques : coefficient requis au 2e cycle pour matiere obligatoire
    if (cls.level.cycle === "DEUXIEME_CYCLE" && dto.isMandatory) {
      const hasCoeff = await this.prisma.subjectCoefficient.count({
        where: {
          subjectId: dto.subjectId,
          levelId: cls.levelId,
          academicYearId: dto.academicYearId,
        },
      });
      if (hasCoeff === 0) {
        throw new BadRequestException(
          "Au deuxieme cycle, une matiere obligatoire doit avoir un coefficient defini pour ce niveau et cette annee.",
        );
      }
    }

    // 8. Creation
    return this.prisma.classSubject.create({
      data: {
        classId: dto.classId,
        subjectId: dto.subjectId,
        academicYearId: dto.academicYearId,
        displayOrder: dto.displayOrder,
        scale: dto.scale,
        isMandatory: dto.isMandatory,
        isActive: dto.isActive,
      },
      include: {
        class: { select: { id: true, code: true, name: true } },
        subject: { select: { id: true, code: true, name: true } },
      },
    });
  }

  // ============================================================
  // CREATION EN MASSE (configuration initiale)
  // ============================================================

  async bulkCreate(dto: ClassSubjectBulkCreateDto, user: CurrentUserPayload) {
    const cls = await this.prisma.class.findUnique({
      where: { id: dto.classId },
      include: { level: true },
    });
    if (!cls) throw new NotFoundException("Classe introuvable");
    if (!isSuperAdmin(user) && cls.schoolId !== user.schoolId) {
      throw new ForbiddenException("Acces refuse a cette classe");
    }

    if (cls.academicYearId !== dto.academicYearId) {
      throw new BadRequestException(
        "L'annee scolaire doit correspondre a celle de la classe",
      );
    }

    // Verifier tous les subjectId existent et appartiennent a la meme ecole
    const subjectIds = dto.subjects.map((s) => s.subjectId);
    const subjects = await this.prisma.subject.findMany({
      where: { id: { in: subjectIds } },
    });
    if (subjects.length !== subjectIds.length) {
      throw new BadRequestException("Une ou plusieurs matieres sont introuvables");
    }
    const wrongSchool = subjects.find((s) => s.schoolId !== cls.schoolId);
    if (wrongSchool) {
      throw new ForbiddenException(
        `La matiere ${wrongSchool.name} appartient a un autre etablissement`,
      );
    }

    // Anti-doublon : verifier ce qui existe deja
    const existing = await this.prisma.classSubject.findMany({
      where: {
        classId: dto.classId,
        academicYearId: dto.academicYearId,
        subjectId: { in: subjectIds },
      },
      select: { subjectId: true },
    });
    const existingSubjectIds = new Set(existing.map((e) => e.subjectId));
    const toCreate = dto.subjects.filter((s) => !existingSubjectIds.has(s.subjectId));

    if (toCreate.length === 0) {
      throw new ConflictException("Toutes les matieres sont deja affectees a cette classe");
    }

    // Creer en transaction atomique
    return this.prisma.$transaction(
      toCreate.map((s) => {
        this.validateScaleForCycle(s.scale, cls.level.cycle);
        return this.prisma.classSubject.create({
          data: {
            classId: dto.classId,
            subjectId: s.subjectId,
            academicYearId: dto.academicYearId,
            displayOrder: s.displayOrder,
            scale: s.scale,
            isMandatory: s.isMandatory,
            isActive: true,
          },
        });
      }),
    );
  }

  // ============================================================
  // MISE A JOUR
  // ============================================================

  async update(id: string, dto: ClassSubjectUpdateDto, user: CurrentUserPayload) {
    const existing = await this.findOne(id, user);

    // Si on change l'echelle, verifier la coherence avec le cycle
    if (dto.scale !== undefined) {
      const cls = await this.prisma.class.findUnique({
        where: { id: existing.classId },
        include: { level: true },
      });
      if (cls) this.validateScaleForCycle(dto.scale, cls.level.cycle);
    }

    return this.prisma.classSubject.update({
      where: { id },
      data: {
        displayOrder: dto.displayOrder,
        scale: dto.scale,
        isMandatory: dto.isMandatory,
        isActive: dto.isActive,
      },
      include: {
        class: { select: { id: true, code: true, name: true } },
        subject: { select: { id: true, code: true, name: true } },
      },
    });
  }

  // ============================================================
  // REORDONNANCEMENT EN MASSE
  // ============================================================

  async reorder(dto: ClassSubjectReorderDto, user: CurrentUserPayload) {
    // Verifier les acces a tous les items
    const ids = dto.items.map((i) => i.id);
    const items = await this.prisma.classSubject.findMany({
      where: { id: { in: ids } },
      include: { class: { select: { schoolId: true } } },
    });
    if (items.length !== ids.length) {
      throw new NotFoundException("Une ou plusieurs affectations sont introuvables");
    }
    if (!isSuperAdmin(user)) {
      const unauthorized = items.find((i) => i.class.schoolId !== user.schoolId);
      if (unauthorized) throw new ForbiddenException("Acces refuse");
    }

    return this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.classSubject.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );
  }

  // ============================================================
  // SUPPRESSION (soft-delete)
  // ============================================================

  async remove(id: string, user: CurrentUserPayload) {
    await this.findOne(id, user);

    // Soft-delete systematique
    return this.prisma.classSubject.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private validateScaleForCycle(scale: number, cycle: string) {
    if (cycle === "PREMIER_CYCLE" && scale !== 10) {
      throw new BadRequestException(
        "Le premier cycle (1ere a 6eme annee) utilise une notation sur 10.",
      );
    }
    if (cycle === "DEUXIEME_CYCLE" && scale !== 20) {
      throw new BadRequestException(
        "Le deuxieme cycle (7eme a 9eme annee) utilise une notation sur 20.",
      );
    }
  }
}