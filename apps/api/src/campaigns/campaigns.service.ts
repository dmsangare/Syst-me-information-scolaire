import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CampaignCreateDto, CampaignUpdateDto, CampaignListQueryDto } from "./dto";
import { CurrentUserPayload } from "../common/decorators";

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liste les campagnes (director validations) avec filtres.
   * Pour SUPER_ADMIN : toutes les écoles. Pour les autres : l'école du user.
   */
  async findAll(schoolId: string | null, query: CampaignListQueryDto) {
    const where: any = {};

    if (schoolId) {
      where.class = { schoolId };
    }

    if (query.academicYearId) {
      where.term = { academicYearId: query.academicYearId };
    }
    if (query.termId) {
      where.termId = query.termId;
    }
    if (query.classId) {
      where.classId = query.classId;
    }
    if (query.status) {
      where.status = query.status;
    }

    const campaigns = await this.prisma.campaignDirectorValidation.findMany({
      where,
      include: {
        term: {
          select: {
            id: true,
            name: true,
            type: true,
            startDate: true,
            endDate: true,
            isLocked: true,
            academicYear: { select: { id: true, label: true } },
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            code: true,
            level: { select: { id: true, name: true, cycle: true } },
          },
        },
      },
      orderBy: [{ term: { startDate: "desc" } }, { class: { name: "asc" } }],
    });

    // Pour chaque campagne, compter les évaluations et les validations enseignants
    const enriched = await Promise.all(
      campaigns.map(async (c) => {
        const assessmentsCount = await this.prisma.assessment.count({
          where: { termId: c.termId, classId: c.classId },
        });
        const teacherValidations = await this.prisma.campaignTeacherValidation.findMany({
          where: { termId: c.termId, classId: c.classId },
          select: { status: true },
        });
        const validated = teacherValidations.filter((v) => v.status === "VALIDE_ENSEIGNANT").length;
        const total = teacherValidations.length;

        return {
          ...c,
          _stats: {
            assessmentsCount,
            teacherValidations: { validated, total },
          },
        };
      }),
    );

    return { data: enriched };
  }

  /**
   * Détail d'une campagne (par id = CampaignDirectorValidation.id).
   */
  async findOne(id: string, schoolId: string | null) {
    const campaign = await this.prisma.campaignDirectorValidation.findUnique({
      where: { id },
      include: {
        term: {
          include: {
            academicYear: { select: { id: true, label: true } },
          },
        },
        class: {
          include: { level: true },
        },
      },
    });

    if (!campaign) throw new NotFoundException("Campagne introuvable");

    if (schoolId && campaign.class.schoolId !== schoolId) {
      throw new ForbiddenException("Acces interdit");
    }

    // Charger les évaluations (assessments) de la campagne
    const assessments = await this.prisma.assessment.findMany({
      where: { termId: campaign.termId, classId: campaign.classId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { grades: true } },
      },
      orderBy: { subject: { name: "asc" } },
    });

    // Charger les validations enseignants
    const teacherValidations = await this.prisma.campaignTeacherValidation.findMany({
      where: { termId: campaign.termId, classId: campaign.classId },
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return {
      data: {
        ...campaign,
        assessments,
        teacherValidations,
      },
    };
  }

  /**
   * Créer une campagne pour une ou plusieurs classes.
   * Le terme doit exister et ne pas être verrouillé.
   */
  async create(dto: CampaignCreateDto, user: CurrentUserPayload) {
    const term = await this.prisma.term.findUnique({
      where: { id: dto.termId },
      select: { id: true, name: true, type: true, isLocked: true },
    });

    if (!term) throw new NotFoundException("Periode introuvable");
    if (term.isLocked) {
      throw new BadRequestException("Cette periode est verrouillee.");
    }

    // Vérifier les classes
    const classes = await this.prisma.class.findMany({
      where: {
        id: { in: dto.classIds },
        ...(user.schoolId ? { schoolId: user.schoolId } : {}),
      },
      select: { id: true, name: true, schoolId: true },
    });

    if (classes.length !== dto.classIds.length) {
      throw new BadRequestException(
        "Certaines classes sont introuvables ou n'appartiennent pas à votre ecole.",
      );
    }

    // Créer une CampaignDirectorValidation par classe
    const created = [];
    for (const cls of classes) {
      // Vérifier qu'il n'y a pas déjà une campagne pour ce term + class
      const existing = await this.prisma.campaignDirectorValidation.findUnique({
        where: {
          termId_classId: { termId: dto.termId, classId: cls.id },
        },
      });

      if (existing) {
        this.logger.warn(
          `Campagne deja existante pour term=${dto.termId} class=${cls.id}, skip.`,
        );
        continue;
      }

      const campaign = await this.prisma.campaignDirectorValidation.create({
        data: {
          termId: dto.termId,
          classId: cls.id,
          status: "BROUILLON",
        },
      });
      created.push(campaign);
    }

    return {
      created: created.length,
      skipped: classes.length - created.length,
      campaigns: created,
    };
  }

  /**
   * Mettre à jour une campagne (notes, statut).
   */
  async update(id: string, dto: CampaignUpdateDto, user: CurrentUserPayload) {
    const existing = await this.prisma.campaignDirectorValidation.findUnique({
      where: { id },
      include: { class: { select: { schoolId: true } } },
    });

    if (!existing) throw new NotFoundException("Campagne introuvable");
    if (user.schoolId && existing.class.schoolId !== user.schoolId) {
      throw new ForbiddenException("Acces interdit");
    }
    if (existing.status === "VALIDE_DIRECTEUR") {
      throw new BadRequestException("Campagne deja validee, impossible de modifier.");
    }

    return this.prisma.campaignDirectorValidation.update({
      where: { id },
      data: {
        // Note : on ne met pas "notes" ici car le champ n'existe pas dans le modèle.
        // Si besoin, on peut ajouter un champ "notes" dans le schéma plus tard.
      },
    });
  }

  /**
   * Activer une campagne (BROUILLON -> ACTIVE).
   * Le directeur peut alors commencer à saisir les évaluations.
   */
  async activate(id: string, user: CurrentUserPayload) {
    const existing = await this.prisma.campaignDirectorValidation.findUnique({
      where: { id },
      include: { class: { select: { schoolId: true } } },
    });

    if (!existing) throw new NotFoundException("Campagne introuvable");
    if (user.schoolId && existing.class.schoolId !== user.schoolId) {
      throw new ForbiddenException("Acces interdit");
    }
    if (existing.status !== "BROUILLON") {
      throw new BadRequestException(
        `Impossible d'activer une campagne en statut ${existing.status}.`,
      );
    }

    return this.prisma.campaignDirectorValidation.update({
      where: { id },
      data: {
        status: "ACTIVE",
        activatedAt: new Date(),
      },
    });
  }

  /**
   * Valider globalement (ACTIVE -> VALIDE_DIRECTEUR).
   * Vérifie que tous les enseignants ont validé leurs matières.
   */
  async validate(id: string, user: CurrentUserPayload) {
    const existing = await this.prisma.campaignDirectorValidation.findUnique({
      where: { id },
      include: { class: { select: { schoolId: true } } },
    });

    if (!existing) throw new NotFoundException("Campagne introuvable");
    if (user.schoolId && existing.class.schoolId !== user.schoolId) {
      throw new ForbiddenException("Acces interdit");
    }
    if (existing.status !== "ACTIVE") {
      throw new BadRequestException(
        `Impossible de valider une campagne en statut ${existing.status}.`,
      );
    }

    // Vérifier que tous les enseignants ont validé
    const teacherValidations = await this.prisma.campaignTeacherValidation.findMany({
      where: { termId: existing.termId, classId: existing.classId },
    });

    const notValidated = teacherValidations.filter((v) => v.status !== "VALIDE_ENSEIGNANT");
    if (notValidated.length > 0) {
      throw new BadRequestException(
        `${notValidated.length} enseignant(s) n'ont pas encore valide leurs notes.`,
      );
    }

    return this.prisma.campaignDirectorValidation.update({
      where: { id },
      data: {
        status: "VALIDE_DIRECTEUR",
        validatedAt: new Date(),
        validatedBy: user.id,
      },
    });
  }

  /**
   * Matières que l'enseignant connecté doit saisir pour cette campagne.
   * - 1er cycle : il doit saisir les compositions (créées par le directeur)
   * - 2e cycle : il doit créer ses évaluations et saisir les notes
   */
  async getMySubjects(campaignId: string, user: CurrentUserPayload) {
    const campaign = await this.prisma.campaignDirectorValidation.findUnique({
      where: { id: campaignId },
      include: {
        term: { select: { type: true } },
        class: { select: { schoolId: true } },
      },
    });

    if (!campaign) throw new NotFoundException("Campagne introuvable");
    if (user.schoolId && campaign.class.schoolId !== user.schoolId) {
      throw new ForbiddenException("Acces interdit");
    }
    if (campaign.status !== "ACTIVE" && campaign.status !== "SAISIE_EN_COURS") {
      throw new BadRequestException("Campagne non active pour la saisie.");
    }

    // Trouver le teacher correspondant à l'utilisateur
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId: user.id },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!teacher) {
      // Si l'utilisateur est directeur/super-admin, il voit toutes les matières
      if (user.roles.includes("DIRECTOR") || user.roles.includes("SUPER_ADMIN")) {
        const assessments = await this.prisma.assessment.findMany({
          where: { termId: campaign.termId, classId: campaign.classId },
          include: {
            subject: { select: { id: true, name: true } },
            teacher: { select: { id: true, firstName: true, lastName: true } },
            _count: { select: { grades: true } },
          },
          orderBy: { subject: { name: "asc" } },
        });
        return {
          campaign: { id: campaign.id, status: campaign.status, termType: campaign.term.type },
          teacher: null,
          assessments,
          isDirector: true,
        };
      }
      throw new ForbiddenException("Aucun profil enseignant associe a votre compte.");
    }

    // Assignations de l'enseignant pour cette classe
    const assignments = await this.prisma.teacherAssignment.findMany({
      where: {
        teacherId: teacher.id,
        classId: campaign.classId,
      },
      include: {
        subject: { select: { id: true, name: true } },
      },
    });

    const mySubjectIds = assignments.map((a) => a.subjectId).filter((s): s is string => !!s);

    const assessments = await this.prisma.assessment.findMany({
      where: {
        termId: campaign.termId,
        classId: campaign.classId,
        subjectId: { in: mySubjectIds },
      },
      include: {
        subject: { select: { id: true, name: true } },
        _count: { select: { grades: true } },
      },
      orderBy: { subject: { name: "asc" } },
    });

    const teacherValidations = await this.prisma.campaignTeacherValidation.findMany({
      where: {
        termId: campaign.termId,
        classId: campaign.classId,
        teacherId: teacher.id,
      },
    });

    return {
      campaign: { id: campaign.id, status: campaign.status, termType: campaign.term.type },
      teacher,
      assignments: assignments.map((a) => ({
        subjectId: a.subjectId,
        subjectName: a.subject?.name,
      })),
      assessments,
      validations: teacherValidations,
      isDirector: false,
    };
  }

  /**
   * Créer une évaluation dans la campagne.
   * - 1er cycle : réservé au directeur
   * - 2e cycle : autorisé pour l'enseignant (créer ses DS/interros)
   */
  async createAssessment(
    campaignId: string,
    dto: {
      subjectId: string;
      type: string;
      title: string;
      date: string;
      maxScore: number;
      coefficient?: number;
      durationMin?: number;
      observation?: string;
    },
    user: CurrentUserPayload,
  ) {
    const campaign = await this.prisma.campaignDirectorValidation.findUnique({
      where: { id: campaignId },
      include: {
        term: { select: { id: true, type: true, academicYearId: true } },
        class: { select: { id: true, schoolId: true } },
      },
    });

    if (!campaign) throw new NotFoundException("Campagne introuvable");
    if (user.schoolId && campaign.class.schoolId !== user.schoolId) {
      throw new ForbiddenException("Acces interdit");
    }
    if (campaign.status !== "ACTIVE" && campaign.status !== "SAISIE_EN_COURS") {
      throw new BadRequestException("Campagne non active.");
    }

    // Trouver le teacher
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    // Si 1er cycle : seul le directeur peut créer (mais on autorise aussi l'enseignant si assigné)
    // Si 2e cycle : l'enseignant doit être assigné à la matière
    let teacherId: string;
    if (teacher) {
      const assignment = await this.prisma.teacherAssignment.findFirst({
        where: {
          teacherId: teacher.id,
          classId: campaign.class.id,
          subjectId: dto.subjectId,
        },
      });
      if (!assignment && !user.roles.includes("DIRECTOR") && !user.roles.includes("SUPER_ADMIN")) {
        throw new ForbiddenException(
          "Vous n'etes pas assigne a cette matiere pour cette classe.",
        );
      }
      teacherId = teacher.id;
    } else {
      // Directeur sans profil teacher : on doit assigner un teacher
      const anyAssignment = await this.prisma.teacherAssignment.findFirst({
        where: {
          classId: campaign.class.id,
          subjectId: dto.subjectId,
        },
        select: { teacherId: true },
      });
      if (!anyAssignment) {
        throw new BadRequestException(
          "Aucun enseignant assigne a cette matiere pour cette classe.",
        );
      }
      teacherId = anyAssignment.teacherId;
    }

    // Créer l'évaluation
    const assessment = await this.prisma.assessment.create({
      data: {
        schoolId: campaign.class.schoolId,
        academicYearId: campaign.term.academicYearId,
        termId: campaign.term.id,
        classId: campaign.class.id,
        subjectId: dto.subjectId,
        teacherId,
        type: dto.type as any,
        title: dto.title,
        date: new Date(dto.date),
        maxScore: dto.maxScore,
        coefficient: dto.coefficient ?? 1,
        durationMin: dto.durationMin,
        status: "DRAFT",
        observation: dto.observation,
      },
    });

    // Passer la campagne en SAISIE_EN_COURS si elle était ACTIVE
    if (campaign.status === "ACTIVE") {
      await this.prisma.campaignDirectorValidation.update({
        where: { id: campaignId },
        data: { status: "SAISIE_EN_COURS" },
      });
    }

    return assessment;
  }

  /**
   * Saisir les notes d'une évaluation (bulk).
   */
  async saveGrades(
    campaignId: string,
    assessmentId: string,
    dto: { grades: Array<{ studentId: string; value: number | null; isAbsent?: boolean; isExempt?: boolean; comment?: string }> },
    user: CurrentUserPayload,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        class: { select: { schoolId: true, id: true } },
        term: { select: { id: true } },
      },
    });

    if (!assessment) throw new NotFoundException("Evaluation introuvable");
    if (user.schoolId && assessment.class.schoolId !== user.schoolId) {
      throw new ForbiddenException("Acces interdit");
    }

    // Vérifier que l'évaluation est bien dans la campagne
    const campaign = await this.prisma.campaignDirectorValidation.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException("Campagne introuvable");
    if (campaign.termId !== assessment.term.id || campaign.classId !== assessment.class.id) {
      throw new BadRequestException("Cette evaluation n'appartient pas a cette campagne.");
    }

    // Vérifier que l'utilisateur peut saisir
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (teacher && assessment.teacherId !== teacher.id && !user.roles.includes("DIRECTOR") && !user.roles.includes("SUPER_ADMIN")) {
      throw new ForbiddenException("Vous ne pouvez pas saisir les notes de cette evaluation.");
    }

    // Upsert des notes
    const results = [];
    for (const g of dto.grades) {
      const grade = await this.prisma.grade.upsert({
        where: {
          assessmentId_studentId: {
            assessmentId,
            studentId: g.studentId,
          },
        },
        update: {
          value: g.value,
          isAbsent: g.isAbsent ?? false,
          isExempt: g.isExempt ?? false,
          comment: g.comment,
          enteredBy: user.id,
        },
        create: {
          assessmentId,
          studentId: g.studentId,
          value: g.value,
          isAbsent: g.isAbsent ?? false,
          isExempt: g.isExempt ?? false,
          comment: g.comment,
          enteredBy: user.id,
          status: g.isAbsent ? "ABSENT" : "PRESENT",
        },
      });
      results.push(grade);
    }

    return { saved: results.length, grades: results };
  }

  /**
   * Valider les notes de l'enseignant pour une matière.
   */
  async validateTeacher(
    campaignId: string,
    dto: { subjectId: string },
    user: CurrentUserPayload,
  ) {
    const campaign = await this.prisma.campaignDirectorValidation.findUnique({
      where: { id: campaignId },
      include: { class: { select: { schoolId: true } } },
    });

    if (!campaign) throw new NotFoundException("Campagne introuvable");
    if (user.schoolId && campaign.class.schoolId !== user.schoolId) {
      throw new ForbiddenException("Acces interdit");
    }

    const teacher = await this.prisma.teacher.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!teacher) throw new ForbiddenException("Aucun profil enseignant.");

    // Vérifier que toutes les évaluations de la matière sont saisies (status != DRAFT)
    const assessments = await this.prisma.assessment.findMany({
      where: {
        termId: campaign.termId,
        classId: campaign.classId,
        subjectId: dto.subjectId,
        teacherId: teacher.id,
      },
      include: { _count: { select: { grades: true } } },
    });

    if (assessments.length === 0) {
      throw new BadRequestException("Aucune evaluation trouvee pour cette matiere.");
    }

    // Vérifier que toutes les évaluations ont des notes
    const emptyAssessments = assessments.filter((a) => a._count.grades === 0);
    if (emptyAssessments.length > 0) {
      throw new BadRequestException(
        `${emptyAssessments.length} evaluation(s) n'ont pas de notes saisies.`,
      );
    }

    // Upsert la validation
    const validation = await this.prisma.campaignTeacherValidation.upsert({
      where: {
        termId_classId_subjectId_teacherId: {
          termId: campaign.termId,
          classId: campaign.classId,
          subjectId: dto.subjectId,
          teacherId: teacher.id,
        },
      },
      update: {
        status: "VALIDE_ENSEIGNANT",
        validatedAt: new Date(),
        validatedBy: user.id,
      },
      create: {
        termId: campaign.termId,
        classId: campaign.classId,
        subjectId: dto.subjectId,
        teacherId: teacher.id,
        status: "VALIDE_ENSEIGNANT",
        validatedAt: new Date(),
        validatedBy: user.id,
      },
    });

    return validation;
  }
  /**
   * Résultats de la campagne : moyennes par élève, par matière, rang.
   * - 1er cycle : moyenne simple des matières (pas de coefficients)
   * - 2e cycle : moyenne pondérée par coefficients de matière
   */
  async getResults(campaignId: string, user: CurrentUserPayload) {
    const campaign = await this.prisma.campaignDirectorValidation.findUnique({
      where: { id: campaignId },
      include: {
        term: {
          select: {
            id: true,
            name: true,
            type: true,
            academicYear: { select: { id: true, label: true } },
          },
        },
        class: {
          include: {
            level: { select: { id: true, name: true, cycle: true } },
          },
        },
      },
    });

    if (!campaign) throw new NotFoundException("Campagne introuvable");
    if (user.schoolId && campaign.class.schoolId !== user.schoolId) {
      throw new ForbiddenException("Acces interdit");
    }

    // Déterminer le cycle et le barème
    const cycle = campaign.class.level?.cycle as string;
    const isFirstCycle = cycle === "PREMIER_CYCLE";
    const scale = isFirstCycle ? 10 : 20;

    // Récupérer les élèves de la classe
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        classId: campaign.classId,
        academicYearId: campaign.term.academicYear.id,
        status: "VALIDATED",
      },
      include: {
        student: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (enrollments.length === 0) {
      return {
        campaign: {
          id: campaign.id,
          term: campaign.term,
          class: campaign.class,
          status: campaign.status,
        },
        cycle,
        scale,
        students: [],
        stats: { totalStudents: 0, totalAssessments: 0 },
      };
    }

    // Récupérer les évaluations de la campagne
    const assessments = await this.prisma.assessment.findMany({
      where: {
        termId: campaign.termId,
        classId: campaign.classId,
        status: { in: ["VALIDATED", "LOCKED", "SUBMITTED"] as any },
      },
      include: {
        subject: { select: { id: true, name: true } },
        grades: true,
      },
    });

    // Récupérer les coefficients de matière (pour 2e cycle)
    const coefficients = await this.prisma.subjectCoefficient.findMany({
      where: {
        levelId: campaign.class.level?.id,
      },
      include: { subject: { select: { id: true, name: true } } },
    });

    const coefficientBySubject = new Map<string, number>();
    for (const c of coefficients) {
      coefficientBySubject.set(c.subjectId, Number(c.coefficient));
    }

    // Calculer les moyennes pour chaque élève
    const studentResults = [];

    for (const enr of enrollments) {
      const studentGrades = new Map<string, Array<{ value: number; coefficient: number }>>();

      // Grouper les notes par matière
      for (const a of assessments) {
        for (const g of a.grades) {
          if (g.studentId !== enr.studentId) continue;
          if (g.value === null || g.isAbsent) continue;

          if (!studentGrades.has(a.subjectId)) {
            studentGrades.set(a.subjectId, []);
          }
          // Normaliser au barème du cycle
          const normalizedValue = (Number(g.value) / Number(a.maxScore)) * scale;
          studentGrades.get(a.subjectId)!.push({
            value: normalizedValue,
            coefficient: Number(a.coefficient),
          });
        }
      }

      // Moyenne par matière
      const subjectAverages = [];
      for (const [subjectId, grades] of studentGrades.entries()) {
        const subject = assessments.find((a) => a.subjectId === subjectId)?.subject;
        if (!subject) continue;

        // Moyenne des évaluations de la matière (pondérée par coefficient d'évaluation)
        const totalWeighted = grades.reduce((s, g) => s + g.value * g.coefficient, 0);
        const totalCoefs = grades.reduce((s, g) => s + g.coefficient, 0);
        const average = totalCoefs > 0 ? Math.round((totalWeighted / totalCoefs) * 100) / 100 : null;

        subjectAverages.push({
          subjectId,
          subjectName: subject.name,
          average,
          coefficient: coefficientBySubject.get(subjectId) ?? 1,
        });
      }

      // Moyenne générale
      let generalAverage: number | null = null;
      if (subjectAverages.length > 0) {
        if (isFirstCycle) {
          // 1er cycle : moyenne simple
          const valid = subjectAverages
            .filter((s) => s.average !== null)
            .map((s) => s.average as number);
          if (valid.length > 0) {
            generalAverage =
              Math.round((valid.reduce((s, v) => s + v, 0) / valid.length) * 100) / 100;
          }
        } else {
          // 2e cycle : moyenne pondérée par coefficients
          const valid = subjectAverages.filter((s) => s.average !== null);
          const totalWeighted = valid.reduce(
            (s, sa) => s + (sa.average as number) * sa.coefficient,
            0,
          );
          const totalCoefs = valid.reduce((s, sa) => s + sa.coefficient, 0);
          if (totalCoefs > 0) {
            generalAverage = Math.round((totalWeighted / totalCoefs) * 100) / 100;
          }
        }
      }

      studentResults.push({
        student: enr.student,
        subjectAverages,
        generalAverage,
        rank: null as number | null, // calculé après
        isComplete: subjectAverages.length > 0 && subjectAverages.every((s) => s.average !== null),
      });
    }

    // Calculer les rangs (compétition : 1, 1, 3)
    const validAverages = studentResults
      .map((r) => r.generalAverage)
      .filter((a): a is number => a !== null);
    for (const r of studentResults) {
      if (r.generalAverage === null) continue;
      const better = validAverages.filter((a) => a > r.generalAverage!).length;
      r.rank = better + 1;
    }

    // Trier par rang (null en dernier)
    studentResults.sort((a, b) => {
      if (a.rank === null && b.rank === null) return 0;
      if (a.rank === null) return 1;
      if (b.rank === null) return -1;
      return a.rank - b.rank;
    });

    return {
      campaign: {
        id: campaign.id,
        status: campaign.status,
        term: {
          id: campaign.term.id,
          name: campaign.term.name,
          type: campaign.term.type,
          academicYear: campaign.term.academicYear,
        },
        class: {
          id: campaign.class.id,
          name: campaign.class.name,
          code: campaign.class.code,
          level: campaign.class.level,
        },
      },
      cycle,
      scale,
      students: studentResults,
      stats: {
        totalStudents: enrollments.length,
        totalAssessments: assessments.length,
        totalSubjects: new Set(assessments.map((a) => a.subjectId)).size,
      },
    };
  }}