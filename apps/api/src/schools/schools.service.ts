import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { SchoolCreateDto, SchoolUpdateDto } from "./dto";
import { CurrentUserPayload } from "../common/decorators";
import { assertSchoolAccess, isSuperAdmin } from "../common/utils";
import { promises as fs } from "fs";
import { join, extname } from "path";

@Injectable()
export class SchoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findAll(user: CurrentUserPayload, page = 1, limit = 20, q?: string) {
    // Un utilisateur non-SUPER_ADMIN ne voit que son ecole
    if (!isSuperAdmin(user) && !user.schoolId) {
      return { data: [], meta: { page, limit, total: 0, pages: 0 } };
    }

    const where: any = {};
    if (!isSuperAdmin(user)) where.id = user.schoolId;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
        { region: { contains: q, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.school.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
      }),
      this.prisma.school.count({ where }),
    ]);

    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        setting: true,
        _count: {
          select: {
            students: true,
            teachers: true,
            classes: true,
            academicYears: true,
          },
        },
      },
    });
    if (!school) throw new NotFoundException("Etablissement introuvable");
    assertSchoolAccess(user, school.id, "Etablissement introuvable");
    return school;
  }

  async create(dto: SchoolCreateDto, user: CurrentUserPayload) {
    // 1. Creer l'ecole
    const school = await this.prisma.school.create({ data: dto as any });

    // 2. Si le createur est SUPER_ADMIN sans ecole, le rattacher a cette ecole
    //    (cas de la 1ere installation : l'admin cree sa propre ecole)
    if (isSuperAdmin(user) && !user.schoolId) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { schoolId: school.id },
      });
    }

        // Creer les categories de depenses par defaut
    await this.createDefaultExpenseCategories(school.id);

    // Creer le Setting par defaut (devise, locale, fuseau, seuils)
    // Defense en profondeur : findBySchool auto-cree aussi, mais on le fait ici
    // pour garantir que TOUTE ecole a un Setting des sa creation.
    await this.prisma.setting.create({
      data: { schoolId: school.id },
    });

    return school;
  }

  async update(id: string, dto: SchoolUpdateDto, user: CurrentUserPayload) {
    await this.findOne(id, user);
    return this.prisma.school.update({ where: { id }, data: dto as any });
  }

  async uploadLogo(id: string, file: Express.Multer.File, user: CurrentUserPayload) {
    if (!file) {
      throw new BadRequestException("Aucun fichier fourni");
    }

    // Valider le type
    const allowed = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException(
        "Format non supporte (PNG, JPG ou SVG uniquement)",
      );
    }

    // Valider la taille (2 Mo)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException("Fichier trop volumineux (max 2 Mo)");
    }

    await this.findOne(id, user);

    // Preparer le dossier de destination
    const storageRoot = this.config.get<string>("storage.root", "./storage");
    const logosDir = join(process.cwd(), storageRoot, "uploads", "logos");
    await fs.mkdir(logosDir, { recursive: true });

    // Nom de fichier unique
    const ext = extname(file.originalname) || ".png";
    const filename = `${id}-${Date.now()}${ext}`;
    const filepath = join(logosDir, filename);

    // Ecrire le fichier
    await fs.writeFile(filepath, file.buffer);

    // URL publique
    const logoUrl = `/api/v1/files/uploads/logos/${filename}`;

    // Mettre a jour l'ecole
    return this.prisma.school.update({
      where: { id },
      data: { logoUrl },
    });
  }

  /**
   * Upload generique d'une image (logo, stamp ou signature).
   */
  private async uploadImage(
    id: string,
    file: Express.Multer.File,
    user: CurrentUserPayload,
    subdir: string,
    fieldName: "logoUrl" | "stampUrl" | "signatureUrl",
  ) {
    if (!file) {
      throw new BadRequestException("Aucun fichier fourni");
    }

    const allowed = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException(
        "Format non supporte (PNG, JPG ou SVG uniquement)",
      );
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException("Fichier trop volumineux (max 2 Mo)");
    }

    await this.findOne(id, user);

    const storageRoot = this.config.get<string>("storage.root", "./storage");
    const dir = join(process.cwd(), storageRoot, "uploads", subdir);
    await fs.mkdir(dir, { recursive: true });

    const ext = extname(file.originalname) || ".png";
    const filename = `${id}-${Date.now()}${ext}`;
    const filepath = join(dir, filename);

    await fs.writeFile(filepath, file.buffer);

    const url = `/api/v1/files/uploads/${subdir}/${filename}`;

    return this.prisma.school.update({
      where: { id },
      data: { [fieldName]: url } as any,
    });
  }

  /**
   * Upload du tampon/cachet de l'ecole.
   */
  async uploadStamp(id: string, file: Express.Multer.File, user: CurrentUserPayload) {
    return this.uploadImage(id, file, user, "stamps", "stampUrl");
  }

  /**
   * Upload de la signature du directeur.
   */
  async uploadSignature(id: string, file: Express.Multer.File, user: CurrentUserPayload) {
    return this.uploadImage(id, file, user, "signatures", "signatureUrl");
  }

  /**
   * Retourne l'etat de configuration de l'ecole pour le wizard de demarrage.
   */
  async getSetupStatus(id: string, user: CurrentUserPayload) {
    assertSchoolAccess(user, id, "Ecole introuvable");

    const year = await this.prisma.academicYear.findFirst({
      where: { schoolId: id, isCurrent: true },
    });

    const [
      levelsCount,
      classesCount,
      subjectsCount,
      usersCount,
      studentsCount,
      trimestreCount,
      moisCount,
    ] = await Promise.all([
      this.prisma.level.count({ where: { schoolId: id } }),
      this.prisma.class.count({ where: { schoolId: id } }),
      this.prisma.subject.count({ where: { schoolId: id } }),
      this.prisma.user.count({ where: { schoolId: id } }),
      this.prisma.student.count({ where: { schoolId: id, deletedAt: null } }),
      year
        ? this.prisma.term.count({ where: { academicYearId: year.id, type: "TRIMESTRE" as any } })
        : 0,
      year
        ? this.prisma.term.count({ where: { academicYearId: year.id, type: "MOIS" as any } })
        : 0,
    ]);

    const steps = {
      schoolInfo: true, // Le school existe deja
      academicYear: !!year,
      periods: (trimestreCount > 0) || (moisCount > 0),
      levels: levelsCount > 0,
      classes: classesCount > 0,
      subjects: subjectsCount > 0,
      users: usersCount > 1, // > 1 car le SUPER_ADMIN compte
      students: studentsCount > 0,
    };

    const completed = Object.values(steps).filter(Boolean).length;
    const total = Object.keys(steps).length;

    return {
      schoolId: id,
      academicYear: year
        ? {
            id: year.id,
            label: year.label,
            startDate: year.startDate,
            endDate: year.endDate,
          }
        : null,
      counts: {
        levels: levelsCount,
        classes: classesCount,
        subjects: subjectsCount,
        users: usersCount,
        students: studentsCount,
        trimestres: trimestreCount,
        mois: moisCount,
      },
      steps,
      completed,
      total,
      isConfigured: completed === total,
    };
  }

  /**
   * Cree les periodes scolaires (trimestres et/ou mois) pour l'annee courante.
   */
  async createSetupPeriods(
    id: string,
    user: CurrentUserPayload,
    dto: { periods: "TRIMESTRE" | "MOIS" | "BOTH" },
  ) {
    assertSchoolAccess(user, id, "Ecole introuvable");

    const year = await this.prisma.academicYear.findFirst({
      where: { schoolId: id, isCurrent: true },
    });
    if (!year) {
      throw new BadRequestException("Aucune annee scolaire active");
    }

    const start = new Date(year.startDate);
    const end = new Date(year.endDate);
    const created: string[] = [];

    // === TRIMESTRES ===
    if (dto.periods === "TRIMESTRE" || dto.periods === "BOTH") {
      const existing = await this.prisma.term.count({
        where: { academicYearId: year.id, type: "TRIMESTRE" as any },
      });
      if (existing === 0) {
        // Diviser l'annee en 3 trimestres
        const months = Math.round(
          (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30),
        );
        const trimestreMonths = Math.ceil(months / 3);

        for (let i = 0; i < 3; i++) {
          const tStart = new Date(start);
          tStart.setMonth(tStart.getMonth() + i * trimestreMonths);
          const tEnd = new Date(start);
          if (i === 2) {
            tEnd.setTime(end.getTime());
          } else {
            tEnd.setMonth(tEnd.getMonth() + (i + 1) * trimestreMonths - 1);
          }

          await this.prisma.term.create({
            data: {
              academicYearId: year.id,
              name: `${i + 1}${i === 0 ? "er" : "eme"} Trimestre`,
              type: "TRIMESTRE" as any,
              startDate: tStart,
              endDate: tEnd,
              orderIndex: i + 1,
            } as any,
          });
          created.push(`${i + 1}${i === 0 ? "er" : "eme"} Trimestre`);
        }
      }
    }

    // === MOIS ===
    if (dto.periods === "MOIS" || dto.periods === "BOTH") {
      const existingMonths = await this.prisma.term.findMany({
        where: { academicYearId: year.id, type: "MOIS" as any },
        select: { name: true },
      });
      const existingNames = new Set(existingMonths.map((m) => m.name));

      const MONTH_NAMES = [
        "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
      ];

      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      let orderIndex = 100;

      while (current.getTime() <= end.getTime()) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        const name = `${MONTH_NAMES[current.getMonth()]} ${current.getFullYear()}`;

        if (!existingNames.has(name)) {
          await this.prisma.term.create({
            data: {
              academicYearId: year.id,
              name,
              type: "MOIS" as any,
              startDate: monthStart,
              endDate: monthEnd,
              orderIndex: orderIndex++,
            } as any,
          });
          created.push(name);
        }

        current.setMonth(current.getMonth() + 1);
      }
    }

    return {
      created: created.length,
      periods: created,
    };
  }

  async remove(id: string, user: CurrentUserPayload) {
    await this.findOne(id, user);
    return this.prisma.school.delete({ where: { id } });
  }

  /**
   * Cree les categories de depenses par defaut pour une nouvelle ecole.
   */
  private async createDefaultExpenseCategories(schoolId: string): Promise<void> {
    const DEFAULT_EXPENSE_CATEGORIES = [
      { code: 'SALAIRES',    name: 'Salaires',              emoji: '\u{1F4BC}' },
      { code: 'FOURNITURES', name: 'Fournitures scolaires', emoji: '\u{1F4DA}' },
      { code: 'ENTRETIEN',   name: 'Entretien et nettoyage',emoji: '\u{1F9F9}' },
      { code: 'ELECTRICITE', name: 'Electricite',           emoji: '\u{1F4A1}' },
      { code: 'LOYER',       name: 'Loyer',                 emoji: '\u{1F3E0}' },
      { code: 'REPARATIONS', name: 'Reparations',           emoji: '\u{1F527}' },
      { code: 'TRANSPORT',   name: 'Transport',             emoji: '\u{1F697}' },
      { code: 'GARDIEN',     name: 'Gardiennage',           emoji: '\u{1F6E1}\uFE0F' },
      { code: 'SANTE',       name: 'Sante',                 emoji: '\u{1F48A}' },
      { code: 'AUTRE',       name: 'Autre',                 emoji: '\u{1F4E6}' },
    ];

    for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
      await this.prisma.expenseCategory.upsert({
        where: { schoolId_code: { schoolId, code: cat.code } },
        update: {},
        create: {
          schoolId,
          code: cat.code,
          name: cat.name,
          emoji: cat.emoji,
          isActive: true,
          isSystem: true,
        },
      });
    }
  }
}
