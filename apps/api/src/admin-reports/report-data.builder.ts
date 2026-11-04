import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Construit les données factuelles d'un rapport à partir de la base.
 * Ne stocke rien — retourne un objet JSON prêt à mettre dans AdminReport.data.
 */
@Injectable()
export class ReportDataBuilder {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // RAP-02 : Rapport de rentrée scolaire
  // ============================================================

  async buildRentree(schoolId: string, academicYearId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true, name: true, code: true, sigle: true, type: true, status: true,
        address: true, region: true, cercle: true, commune: true, quarter: true,
        phone: true, email: true, website: true,
        directorName: true, motto: true,
        academy: true, cap: true, institutionalCode: true,
      },
    });

    const year = await this.prisma.academicYear.findUnique({
      where: { id: academicYearId },
      select: { id: true, startDate: true, endDate: true, status: true, isCurrent: true },
    });

    const classes = await this.prisma.class.findMany({
      where: { schoolId, academicYearId },
      include: {
        level: true,
      },
      orderBy: [{ level: { orderIndex: 'asc' } }, { name: 'asc' }],
    });

    // Effectifs par classe
    const classesStats = await Promise.all(
      classes.map(async (cls) => {
        const [total, girls, boys] = await Promise.all([
          this.prisma.enrollment.count({
            where: { classId: cls.id, academicYearId, status: 'VALIDATED' },
          }),
          this.prisma.enrollment.count({
            where: {
              classId: cls.id, academicYearId, status: 'VALIDATED',
              student: { gender: 'F' },
            },
          }),
          this.prisma.enrollment.count({
            where: {
              classId: cls.id, academicYearId, status: 'VALIDATED',
              student: { gender: 'M' },
            },
          }),
        ]);

        return {
          classId: cls.id,
          className: cls.name,
          classCode: cls.code,
          levelName: cls.level.name,
          cycle: cls.level.cycle,
          capacity: cls.capacity,
          total, girls, boys,
          repeating: 0, // à brancher plus tard (source : StudentPathway)
        };
      }),
    );

    // Agrégats
    const totalStudents = classesStats.reduce((s, c) => s + c.total, 0);
    const totalGirls = classesStats.reduce((s, c) => s + c.girls, 0);
    const totalBoys = classesStats.reduce((s, c) => s + c.boys, 0);
    const classesCount = classes.length;

    // Par cycle
    const byCycle: Record<string, { classes: number; total: number; girls: number; boys: number }> = {};
    for (const c of classesStats) {
      const k = c.cycle;
      byCycle[k] ??= { classes: 0, total: 0, girls: 0, boys: 0 };
      byCycle[k].classes += 1;
      byCycle[k].total += c.total;
      byCycle[k].girls += c.girls;
      byCycle[k].boys += c.boys;
    }

    return {
      identification: {
        school: {
          name: school?.name,
          code: school?.code,
          sigle: school?.sigle,
          type: school?.type,
          status: school?.status,
          address: school?.address,
          region: school?.region,
          cercle: school?.cercle,
          commune: school?.commune,
          quarter: school?.quarter,
          phone: school?.phone,
          email: school?.email,
          website: school?.website,
          directorName: school?.directorName,
          motto: school?.motto,
          academy: school?.academy,
          cap: school?.cap,
          institutionalCode: school?.institutionalCode,
        },
        academicYear: year,
        referenceDate: new Date().toISOString().split('T')[0],
      },
      synthese: {
        totalStudents,
        totalGirls,
        totalBoys,
        classesCount,
      },
      classes: classesStats,
      parCycle: byCycle,
    };
  }

  // ============================================================
  // RAP-04 : Rapport sur le personnel enseignant et administratif
  // ============================================================

  async buildPersonnel(schoolId: string, academicYearId: string) {
    // 1. Tous les enseignants
    const teachers = await this.prisma.teacher.findMany({
      where: { schoolId, status: 'ACTIVE' },
      include: {
        assignments: {
          where: { academicYearId },
          include: {
            subject: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // 2. Personnel administratif via UserRole + Role.code
    // On cherche les users dont le role n'est PAS Enseignant
    const adminRoles = ['DIRECTOR', 'SECRETARY', 'ACCOUNTANT', 'SUPERVISOR', 'PROMOTER'];
    const adminUsers = await this.prisma.user.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
        userRoles: {
          some: {
            role: {
              OR: [
                { code: { in: adminRoles } },
                { name: { in: ['Direction', 'Secrétariat', 'Comptable / Caissier', 'Surveillant', 'Promoteur'] } },
              ],
            },
          },
        },
      },
      include: {
        userRoles: {
          include: { role: { select: { code: true, name: true } } },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // 3. Detail par enseignant
    const teachersDetail = teachers.map((t) => ({
      matricule: t.matricule,
      fullName: `${t.lastName} ${t.firstName}`,
      gender: t.gender,
      specialty: t.specialty,
      diploma: t.diploma,
      contractType: t.contractType,
      hireDate: t.hireDate,
      subjects: t.assignments.map((a) => a.subject?.name).filter((v): v is string => !!v).filter((v, i, arr) => arr.indexOf(v) === i),
      assignmentsCount: t.assignments.length,
    }));

    // 4. Repartition par matiere
    const bySubject: Record<string, number> = {};
    for (const t of teachers) {
      for (const a of t.assignments) {
        const name = a.subject?.name;
        if (!name) continue;
        bySubject[name] = (bySubject[name] ?? 0) + 1;
      }
    }

    // 5. Repartition par diplome
    const byDiploma: Record<string, number> = {};
    for (const t of teachers) {
      const k = t.diploma || 'Non renseigné';
      byDiploma[k] = (byDiploma[k] ?? 0) + 1;
    }

    // 6. Repartition par contrat
    const byContract: Record<string, number> = {};
    for (const t of teachers) {
      const k = t.contractType || 'Non renseigné';
      byContract[k] = (byContract[k] ?? 0) + 1;
    }

    // 7. Repartition par sexe (enseignants)
    const teachersByGender = {
      filles: teachers.filter((t) => t.gender === 'F').length,
      garcons: teachers.filter((t) => t.gender === 'M').length,
      total: teachers.length,
    };

    // 8. Personnel administratif
    const adminDetail = adminUsers.map((u) => ({
      fullName: `${u.lastName} ${u.firstName}`,
      email: u.email,
      phone: u.phone,
      roles: u.userRoles.map((ur) => ur.role.name),
    }));

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        name: true, code: true, type: true, region: true,
        academy: true, cap: true, directorName: true,
      },
    });

    const year = await this.prisma.academicYear.findUnique({
      where: { id: academicYearId },
      select: { id: true, startDate: true, endDate: true, isCurrent: true },
    });

    return {
      reference: {
        school,
        academicYear: year,
        referenceDate: new Date().toISOString().split('T')[0],
      },
      synthese: {
        totalTeachers: teachers.length,
        totalAdmin: adminUsers.length,
        teachersByGender,
      },
      repartitionParMatiere: bySubject,
      repartitionParDiplome: byDiploma,
      repartitionParContrat: byContract,
      enseignants: teachersDetail,
      personnelAdministratif: adminDetail,
    };
  }

  // ============================================================
  // RAP-05 : Rapport sur les infrastructures et equipements
  // ============================================================

  async buildInfrastructures(schoolId: string, academicYearId: string) {
    // 1. Toutes les salles
    const rooms = await this.prisma.room.findMany({
      where: { schoolId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    // 2. Repartition par type
    const byType: Record<string, { count: number; capacity: number; available: number }> = {};
    for (const r of rooms) {
      const k = r.type;
      byType[k] ??= { count: 0, capacity: 0, available: 0 };
      byType[k].count += 1;
      byType[k].capacity += r.capacity ?? 0;
      if (r.isAvailable) byType[k].available += 1;
    }

    // 3. Detail de chaque salle
    const roomsDetail = rooms.map((r) => ({
      name: r.name,
      type: r.type,
      capacity: r.capacity,
      location: r.location,
      isAvailable: r.isAvailable,
      equipment: r.equipment ?? null,
      equipmentCount: this.countEquipment(r.equipment),
    }));

    // 4. Synthese
    const totalRooms = rooms.length;
    const totalAvailable = rooms.filter((r) => r.isAvailable).length;
    const totalCapacity = rooms.reduce((s, r) => s + (r.capacity ?? 0), 0);
    const classroomCount = rooms.filter((r) => r.type === 'CLASSROOM').length;
    const classroomsCapacity = rooms
      .filter((r) => r.type === 'CLASSROOM')
      .reduce((s, r) => s + (r.capacity ?? 0), 0);

    // 5. Equipements agreges (depuis les JSON)
    const equipmentAggregated: Record<string, number> = {};
    for (const r of rooms) {
      if (r.equipment && typeof r.equipment === 'object') {
        for (const [k, v] of Object.entries(r.equipment as any)) {
          const n = typeof v === 'number' ? v : 1;
          equipmentAggregated[k] = (equipmentAggregated[k] ?? 0) + n;
        }
      }
    }

    // 6. Reference
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        name: true, code: true, type: true, region: true,
        academy: true, cap: true, directorName: true,
      },
    });

    const year = await this.prisma.academicYear.findUnique({
      where: { id: academicYearId },
      select: { id: true, startDate: true, endDate: true, isCurrent: true },
    });

    return {
      reference: {
        school,
        academicYear: year,
        referenceDate: new Date().toISOString().split('T')[0],
      },
      synthese: {
        totalRooms,
        totalAvailable,
        totalCapacity,
        classroomCount,
        classroomsCapacity,
      },
      repartitionParType: byType,
      equipements: equipmentAggregated,
      salles: roomsDetail,
    };
  }

  private countEquipment(equipment: any): number {
    if (!equipment || typeof equipment !== 'object') return 0;
    let total = 0;
    for (const v of Object.values(equipment)) {
      total += typeof v === 'number' ? v : 1;
    }
    return total;
  }

  // ============================================================
  // RAP-06 : Rapport annuel de situation morale, materielle, pedagogique
  // ============================================================

  async buildAnnualSituation(schoolId: string, academicYearId: string) {
    // 1. Agreger les donnees factuelles des autres builders
    const [rentree, personnel, infra] = await Promise.all([
      this.buildRentree(schoolId, academicYearId),
      this.buildPersonnel(schoolId, academicYearId),
      this.buildInfrastructures(schoolId, academicYearId),
    ]);

    // 2. Identification
    const identification = rentree.identification;

    // 3. Situation administrative
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        status: true, type: true, tutelleInfo: true,
        directorName: true, createdAt: true,
      },
    });

    const admin = {
      statutEtablissement: school?.status,
      typeEtablissement: school?.type,
      autorisation: school?.tutelleInfo ?? null,
      directeur: school?.directorName ?? null,
      classesOuvertes: rentree.synthese.classesCount,
      ordresEnseignement: Array.from(new Set(rentree.classes.map((c) => c.cycle))),
    };

    // 4. Situation pedagogique
    const pedagogique = {
      effectifsTotal: rentree.synthese.totalStudents,
      effectifsFilles: rentree.synthese.totalGirls,
      effectifsGarcons: rentree.synthese.totalBoys,
      nombreClasses: rentree.synthese.classesCount,
      personnelEnseignant: personnel.synthese.totalTeachers,
      personnelAdministratif: personnel.synthese.totalAdmin,
      repartitionParCycle: rentree.parCycle,
      repartitionParMatiere: personnel.repartitionParMatiere,
      // Resultats scolaires agreges : rempli par le bloc B10 (validation) si besoin
      resultatsAgreges: null,
      difficultesPedagogiques: '',
      actionsCorrectives: '',
      activitesComplementaires: '',
    };

    // 5. Situation materielle
    const materiel = {
      sallesTotal: infra.synthese.totalRooms,
      sallesDisponibles: infra.synthese.totalAvailable,
      sallesClasse: infra.synthese.classroomCount,
      capaciteTotale: infra.synthese.totalCapacity,
      repartitionParType: infra.repartitionParType,
      equipements: infra.equipements,
      etatLocaux: '',
      besoinsEquipements: '',
      travauxRealises: '',
    };

    // 6. Situation morale (a remplir manuellement)
    const morale = {
      reglementInterieur: '',
      applicationReglement: '',
      organisationVieScolaire: '',
      actionsSensibilisation: '',
      mesuresPrevention: '',
      activitesEducatives: '',
      difficultesDiscipline: '',
    };

    // 7. Difficultes et perspectives (a remplir manuellement)
    const perspectives = {
      difficultesRencontrees: '',
      mesuresPrises: '',
      besoinsIdentifies: '',
      planAmelioration: '',
      projetsAnneeSuivante: '',
    };

    // 8. Validation (rempli plus tard au moment de la validation)
    const validation = {
      responsableNom: school?.directorName ?? '',
      responsableFonction: 'Directeur',
      dateValidation: null,
      signatureUrl: null,
      cachetUrl: null,
    };

    return {
      identification,
      situationAdministrative: admin,
      situationPedagogique: pedagogique,
      situationMaterielle: materiel,
      situationMorale: morale,
      perspectives,
      validation,
      _meta: {
        sectionsFactuelles: ['identification', 'situationAdministrative', 'situationPedagogique', 'situationMaterielle'],
        sectionsManuelles: ['situationMorale', 'perspectives'],
      },
    };
  }

  // ============================================================
  // RAP-07 : Rapport de fin d'annee
  // ============================================================

  async buildYearEnd(schoolId: string, academicYearId: string) {
    // 1. Base : effectifs actuels (fin d'annee = effectifs de rentree, ajustes)
    const rentree = await this.buildRentree(schoolId, academicYearId);

    // 2. Resultats annuels via StudentPathway
    const pathways = await this.prisma.studentPathway.findMany({
      where: {
        academicYearId,
        student: { schoolId },
      },
      include: {
        class: { select: { id: true, name: true, levelId: true } },
        level: { select: { id: true, name: true, cycle: true } },
      },
    });

    const totalEvaluated = pathways.length;
    const passed = pathways.filter((p) => p.result === 'PASSED').length;
    const repeated = pathways.filter((p) => p.result === 'REPEATED').length;
    const excluded = pathways.filter((p) => p.result === 'EXCLUDED').length;
    const transferred = pathways.filter((p) => p.result === 'TRANSFERRED').length;
    const undecided = pathways.filter((p) => !p.result).length;

    // 3. Taux (uniquement si denominateur > 0)
    const rates = {
      tauxReussite: totalEvaluated > 0 ? Number(((passed / totalEvaluated) * 100).toFixed(2)) : null,
      tauxRedoublement: totalEvaluated > 0 ? Number(((repeated / totalEvaluated) * 100).toFixed(2)) : null,
      tauxExclusion: totalEvaluated > 0 ? Number(((excluded / totalEvaluated) * 100).toFixed(2)) : null,
      tauxTransfert: totalEvaluated > 0 ? Number(((transferred / totalEvaluated) * 100).toFixed(2)) : null,
    };

    // 4. Resultats par classe
    const byClass: Record<string, any> = {};
    for (const p of pathways) {
      const k = p.class?.name ?? 'Non affecté';
      byClass[k] ??= {
        classId: p.class?.id,
        className: p.class?.name,
        levelName: p.level?.name,
        cycle: p.level?.cycle,
        total: 0, passed: 0, repeated: 0, excluded: 0, transferred: 0, undecided: 0,
      };
      byClass[k].total += 1;
      if (p.result === 'PASSED') byClass[k].passed += 1;
      else if (p.result === 'REPEATED') byClass[k].repeated += 1;
      else if (p.result === 'EXCLUDED') byClass[k].excluded += 1;
      else if (p.result === 'TRANSFERRED') byClass[k].transferred += 1;
      else byClass[k].undecided += 1;
    }

    // 5. Resultats par niveau
    const byLevel: Record<string, any> = {};
    for (const p of pathways) {
      const k = p.level?.name ?? 'Non affecté';
      byLevel[k] ??= {
        levelName: p.level?.name,
        cycle: p.level?.cycle,
        total: 0, passed: 0, repeated: 0, excluded: 0, transferred: 0,
      };
      byLevel[k].total += 1;
      if (p.result === 'PASSED') byLevel[k].passed += 1;
      else if (p.result === 'REPEATED') byLevel[k].repeated += 1;
      else if (p.result === 'EXCLUDED') byLevel[k].excluded += 1;
      else if (p.result === 'TRANSFERRED') byLevel[k].transferred += 1;
    }

    // 6. Sorties (transferts confirmees)
    const transfersOut = await this.prisma.studentTransfer.count({
      where: {
        type: 'OUT',
        status: 'VERIFIED',
        effectiveDate: {
          gte: (await this.prisma.academicYear.findUnique({ where: { id: academicYearId } }))?.startDate ?? undefined,
          lte: (await this.prisma.academicYear.findUnique({ where: { id: academicYearId } }))?.endDate ?? undefined,
        },
        student: { schoolId },
      },
    }).catch(() => 0);

    // 7. Reference
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, code: true, type: true, region: true, academy: true, cap: true, directorName: true },
    });

    const year = await this.prisma.academicYear.findUnique({
      where: { id: academicYearId },
      select: { id: true, startDate: true, endDate: true, isCurrent: true },
    });

    return {
      reference: { school, academicYear: year, referenceDate: new Date().toISOString().split('T')[0] },
      synthese: {
        effectifDebut: rentree.synthese.totalStudents,
        effectifFin: totalEvaluated,
        totalEvaluated,
        passed, repeated, excluded, transferred, undecided,
        transfertsSortants: transfersOut,
      },
      taux: rates,
      resultatsParClasse: Object.values(byClass),
      resultatsParNiveau: Object.values(byLevel),
    };
  }

  // ============================================================
  // RAP-03 : Rapport statistique des effectifs
  // ============================================================

  async buildStats(schoolId: string, academicYearId: string) {
    const base = await this.buildRentree(schoolId, academicYearId);

    // Par niveau
    const byLevel: Record<string, { total: number; girls: number; boys: number; classes: number }> = {};
    for (const c of base.classes) {
      const k = c.levelName;
      byLevel[k] ??= { total: 0, girls: 0, boys: 0, classes: 0 };
      byLevel[k].total += c.total;
      byLevel[k].girls += c.girls;
      byLevel[k].boys += c.boys;
      byLevel[k].classes += 1;
    }

    return {
      reference: base.identification,
      synthese: base.synthese,
      effectifsParClasse: base.classes,
      effectifsParNiveau: byLevel,
      repartitionParCycle: base.parCycle,
      repartitionParSexe: {
        filles: base.synthese.totalGirls,
        garcons: base.synthese.totalBoys,
        total: base.synthese.totalStudents,
      },
    };
  }
}