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

  /**
   * Recalcule le Top 3 (tableau d'honneur) pour une école et un trimestre donnés.
   * Appelée automatiquement après la génération/modification d'un bulletin.
   *
   * Pour chaque cycle (PREMIER_CYCLE, DEUXIEME_CYCLE, LYCEE) :
   *  - Récupère tous les ReportCard PUBLISHED du term pour ce cycle
   *  - Trie par moyenne DESC
   *  - Prend le top 3
   *  - Écrit dans la table top_students
   */
  async recomputeTopStudents(
    schoolId: string,
    termId?: string,
  ): Promise<{ updated: number }> {
    // Sans periode precisee : on recalcule toutes les periodes actives (composition du mois + trimestre)
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

    // 1. Déterminer le trimestre
    let term;
    if (termId) {
      term = await this.prisma.term.findUnique({ where: { id: termId } });
    } else {
      // Prendre le trimestre actif (aujourd'hui entre startDate et endDate)
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
      this.logger.warn(
        `Aucun trimestre actif pour l'ecole ${schoolId}. Recalcul ignore.`,
      );
      return { updated: 0 };
    }

    // 2. Récupérer tous les ReportCard PUBLISHED du trimestre
    const reportCards = await this.prisma.reportCard.findMany({
      where: {
        termId: term.id,
        status: "PUBLISHED",
        isComplete: true,   // L8 : exclure les dossiers incomplets
        student: { schoolId },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            level: { select: { cycle: true, name: true } },
          },
        },
      },
    });

    if (reportCards.length === 0) {
      this.logger.log(
        `Aucun bulletin publie pour le term ${term.id}. Recalcul ignore.`,
      );
      return { updated: 0 };
    }

    // 3. Grouper par cycle
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

    // 4. Pour chaque cycle, trier et prendre le top 3
    // (l'annee affichee est celle du trimestre, pas forcement l'annee en cours)
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

      // Trier par moyenne desc ; en cas d'egalite : ordre alphabetique (resultat stable)
      // Déduplication par studentId : un élève ne peut apparaître qu'une fois par période.
      // En cas de cartes multiples (ex. import en double), on garde la meilleure moyenne.
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

      // Suppression + insertion dans UNE transaction : le classement n'est jamais a moitie vide
      await this.prisma.$transaction([
        this.prisma.topStudent.deleteMany({
          where: { schoolId, cycle, periodLabel },
        }),
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

    this.logger.log(
      `Top students recalcule : ${totalUpdated} eleves mis a jour (term ${term.id})`,
    );

    return { updated: totalUpdated };
  }

  /**
   * Tableau d'honneur : Top N CLASSES par cycle.
   * - Moyenne classe = moyenne des ReportCard.average PUBLISHED des eleves
   * - Classes sans bulletin publie exclues
   * - Eleves sans average exclus
   * - Exaequo : comparaison au centieme, rang partage puis saut (1,2,2,4)
   */
  async getHonorRoll(schoolId: string, termId?: string, cycleFilter?: string) {
    const data = await this.settings.getDataWithDefaults(schoolId);
    const topN = Math.max(1, Number(data?.honorRoll?.topN ?? 3));

    // 1. Periode ciblee
    const terms = termId
      ? await this.prisma.term.findMany({ where: { id: termId } })
      : await this.prisma.term.findMany({
          where: { academicYear: { schoolId, isCurrent: true } },
        });

    const emptyPodiums = (): Record<string, any[]> => ({
      PREMIER_CYCLE: [], DEUXIEME_CYCLE: [], LYCEE: [],
    });
    if (terms.length === 0) {
      return { topN, term: null, podiums: emptyPodiums() };
    }

    // 2. Classes de l'ecole (filtre cycle optionnel)
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

      // 3. Moyennes des bulletins PUBLISHED par classe
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
          scale: 20, // sera ajuste selon cycle plus bas
        });
      }
      if (byClass.length === 0) continue;

      // 4. Tri desc + exaequo au centieme
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

  /**
   * Retourne le top 3 pour chaque cycle (visible par tous).
   */
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

    // Chaque cycle affiche sa periode la plus recente : composition du mois (1er cycle) ou trimestre (2eme cycle, lycee)
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
      // D13 : enrichir avec classSize (inscrits) et studentsCount (classés)
      const filteredRows = cycleRows.filter((r) => r.termId === best.id);
      const classIdsForCycle = Array.from(new Set(filteredRows.map((r) => r.classId)));

      // Effectif classé : nombre de ReportCard PUBLISHED par classe pour ce term
      const classCounts = await this.prisma.reportCard.groupBy({
        by: ["classId"],
        where: {
          classId: { in: classIdsForCycle },
          termId: best.id,
          status: "PUBLISHED",
          student: { schoolId },
        },
        _count: { _all: true },
      });
      const studentsCountByClass = new Map(
        classCounts.map((c) => [c.classId, c._count._all]),
      );

      // Effectif inscrit : nombre d'Enrollment VALIDATED par classe pour ce term
      const enrollCounts = await this.prisma.enrollment.groupBy({
        by: ["classId"],
        where: {
          classId: { in: classIdsForCycle },
          academicYearId: best.academicYearId,
          status: "VALIDATED",
        },
        _count: { _all: true },
      });
      const classSizeByClass = new Map(
        enrollCounts.map((c) => [c.classId, c._count._all]),
      );

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
        ? {
            id: latest.id,
            name: latest.name,
            type: latest.type,
            startDate: latest.startDate,
            endDate: latest.endDate,
          }
        : null,
      periods,
      podiums,
    };
  }

  /**
   * Retourne les donnees du dashboard pour un enseignant.
   */
  async getTeacherDashboard(userId: string, schoolId: string) {
    // 1. Trouver le Teacher associe a cet utilisateur
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId, schoolId },
    });

    if (!teacher) {
      return {
        hasProfile: false,
        message: "Aucun profil enseignant associe",
      };
    }

    // 2. Ses assignments (classes + matieres) pour l'annee en cours
    const year = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });

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

    // 3. Classes uniques
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

    // 4. Matieres uniques
    const subjectsMap = new Map<string, any>();
    for (const a of assignments) {
      if (a.subjectId && a.subject && !subjectsMap.has(a.subjectId)) {
        subjectsMap.set(a.subjectId, a.subject);
      }
    }
    const mySubjects = Array.from(subjectsMap.values());

    // 5. Total eleves
    const totalStudents = myClasses.reduce(
      (sum, c) => sum + (c.studentCount || 0),
      0,
    );

    // 6. Evaluations a venir (7 jours)
    const today = new Date();
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const upcomingAssessments = await this.prisma.assessment.findMany({
      where: {
        teacherId: teacher.id,
        schoolId,
        date: { gte: today, lte: in7Days },
      },
      orderBy: { date: "asc" },
      take: 10,
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });

    // 7. Notes a saisir (assessments sans notes)
    const pendingAssessments = await this.prisma.assessment.findMany({
      where: {
        teacherId: teacher.id,
        schoolId,
        status: { in: ["DRAFT", "OPEN"] },
      },
      orderBy: { date: "desc" },
      take: 10,
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
        _count: { select: { grades: true } },
      },
    });

    return {
      hasProfile: true,
      teacher: {
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        matricule: teacher.matricule,
      },
      myClasses,
      mySubjects,
      totalStudents,
      upcomingAssessments,
      pendingAssessments,
    };
  }

  /**
   * Retourne les donnees du dashboard pour un surveillant.
   */
  async getSupervisorDashboard(schoolId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });

    // Sessions de presence du jour
    const todaySessions = year
      ? await this.prisma.attendanceSession.count({
          where: {
            date: today,
            class: { academicYearId: year.id, schoolId },
          },
        })
      : 0;

    // Absents du jour
    const absents = await this.prisma.attendanceRecord.findMany({
      where: {
        status: "ABSENT",
        session: {
          date: today,
          class: { schoolId },
        },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            guardians: {
              select: {
                guardian: {
                  select: { id: true, firstName: true, lastName: true, phone: true, relationType: true },
                },
              },
            },
          },
        },
        session: {
          select: {
            class: { select: { name: true } },
            startTime: true,
          },
        },
      },
      take: 20,
    });

    return {
      todaySessions,
      absentsCount: absents.length,
      absents,
    };
  }

  /**
   * Retourne les donnees du dashboard pour une secretaire.
   */
  async getSecretaryDashboard(schoolId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Inscriptions du jour
    const todayEnrollments = await this.prisma.enrollment.count({
      where: {
        student: { schoolId },
        enrollmentDate: { gte: today },
      },
    });

    // Derniers eleves inscrits
    const recentStudents = await this.prisma.student.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        matricule: true,
        createdAt: true,
      },
    });

    // Total eleves actifs
    const totalStudents = await this.prisma.student.count({
      where: { schoolId, status: "ACTIVE" },
    });

    return {
      todayEnrollments,
      totalStudents,
      recentStudents,
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private async getYearLabel(schoolId: string): Promise<string | null> {
    const year = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { label: true },
    });
    return year?.label ?? null;
  }
}