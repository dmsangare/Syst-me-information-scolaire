import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminReportsService } from './admin-reports.service';
import { generateReportPDF } from '../reports/pdf/report-pdf.util';
import { generateOfficialReportPDF } from './pdf/admin-report-pdf.util';
import { PdfGeneratorService } from '../common/pdf';
import { generateExcel } from '../students/utils/excel.util';
import { ListTemplatesQuerySchema, ListReportsQuerySchema } from './dto';

@Controller('admin-reports')
@UseGuards(JwtAuthGuard)
export class AdminReportsController {
  constructor(
    private readonly service: AdminReportsService,
    private readonly pdfGenerator: PdfGeneratorService,
  ) {}

  private sid(req: any): string { return req.user.schoolId; }
  private uid(req: any): string { return req.user.id ?? req.user.userId; }

  @Get('health')
  health() { return { status: 'ok', module: 'admin-reports' }; }

  @Post('seed')
  async seed() { return this.service.ensureSeed(); }

  // --- Templates ---
  @Get('templates')
  async listTemplates(@Req() req: any, @Query() query: any) {
    return this.service.listTemplates(this.sid(req), ListTemplatesQuerySchema.parse(query));
  }

  @Get('templates/:id')
  async getTemplate(@Req() req: any, @Param('id') id: string) {
    return this.service.getTemplate(this.sid(req), id);
  }

  // --- Reports ---
  @Get('reports')
  async listReports(@Req() req: any, @Query() query: any) {
    return this.service.listReports(this.sid(req), ListReportsQuerySchema.parse(query));
  }

  @Get('reports/:id')
  async getReport(@Req() req: any, @Param('id') id: string) {
    return this.service.getReport(this.sid(req), id);
  }

  @Post('reports')
  async createReport(@Req() req: any, @Body() body: any) {
    return this.service.createReport(this.sid(req), this.uid(req), body);
  }

  @Post('reports/:id/generate')
  async generate(@Req() req: any, @Param('id') id: string) {
    return this.service.generateReport(this.sid(req), this.uid(req), id);
  }

  @Patch('reports/:id')
  async patch(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.patchReport(this.sid(req), this.uid(req), id, body);
  }

  // ============================================================
  // Export PDF
  // ============================================================

  @Get('reports/:id/pdf')
  async pdf(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const { data: report } = await this.service.getReport(this.sid(req), id);

    // Charger l'ecole (pour logo, signature, cachet, infos)
    const school = await this.service['prisma'].school.findUnique({
      where: { id: this.sid(req) },
      select: {
        name: true, code: true, sigle: true, type: true,
        region: true, cercle: true, commune: true, address: true,
        phone: true, email: true, website: true, motto: true,
        directorName: true, academy: true, cap: true,
        logoUrl: true, stampUrl: true, signatureUrl: true,
      },
    });

    // Charger l'annee scolaire si presente
    let academicYear: any = null;
    if (report.academicYearId) {
      academicYear = await this.service['prisma'].academicYear.findUnique({
        where: { id: report.academicYearId },
        select: { startDate: true, endDate: true },
      });
    }

    const sections = this.buildPdfSections(report);
    const summary = this.buildPdfSummary(report);

    const pdf = await generateOfficialReportPDF({
      school: {
        name: school?.name ?? req.user.schoolName ?? 'Établissement',
        code: school?.code,
        sigle: school?.sigle,
        type: school?.type,
        region: school?.region,
        cercle: school?.cercle,
        commune: school?.commune,
        address: school?.address,
        phone: school?.phone,
        email: school?.email,
        website: school?.website,
        motto: school?.motto,
        directorName: school?.directorName,
        academy: school?.academy,
        cap: school?.cap,
        logoUrl: school?.logoUrl,
        stampUrl: school?.stampUrl,
        signatureUrl: school?.signatureUrl,
      },
      academicYear,
      report: {
        code: report.code,
        title: report.title,
        version: report.version,
        bordereauNumber: report.bordereauNumber,
        validatedAt: report.validatedAt,
        status: report.status,
      },
      referenceDate: report.referenceDate ? String(report.referenceDate) : undefined,
      summary,
      sections,
      signature: {
        name: school?.directorName,
        role: 'Le Directeur',
        place: school?.commune,
      },
    }, this.pdfGenerator);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${report.code}-${report.id.slice(0, 8)}.pdf"`,
    );
    res.send(pdf);
  }

  // ============================================================
  // Export Excel
  // ============================================================

  @Get('reports/:id/excel')
  async excel(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const { data: report } = await this.service.getReport(this.sid(req), id);
    const opts = this.buildExcelOptions(report, req.user.schoolName ?? 'Établissement');

    const excel = await generateExcel(opts);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${report.code}-${report.id.slice(0, 8)}.xlsx"`,
    );
    res.send(excel);
  }

  private buildExcelOptions(report: any, schoolName: string): any {
    const d = (report.data as any) ?? {};
    const subtitle = `${report.code} — ${report.periodLabel ?? ''}`;

    // === RAP-02 / RAP-03 : effectifs ===
    if (report.code === 'RAP-02' || report.code === 'RAP-03') {
      const classes: any[] = d.classes ?? d.effectifsParClasse ?? [];
      return {
        title: report.title,
        subtitle,
        sheetName: 'Effectifs',
        schoolName,
        columns: [
          { header: 'Classe', key: 'className', width: 20 },
          { header: 'Niveau', key: 'levelName', width: 15 },
          { header: 'Cycle', key: 'cycle', width: 20 },
          { header: 'Capacité', key: 'capacity', width: 12 },
          { header: 'Total', key: 'total', width: 10 },
          { header: 'Filles', key: 'girls', width: 10 },
          { header: 'Garçons', key: 'boys', width: 10 },
        ],
        data: classes.map((c) => ({
          className: c.className,
          levelName: c.levelName,
          cycle: c.cycle,
          capacity: c.capacity ?? '',
          total: c.total,
          girls: c.girls,
          boys: c.boys,
        })),
      };
    }

    // === RAP-04 : personnel ===
    if (report.code === 'RAP-04') {
      const teachers: any[] = d.enseignants ?? [];
      return {
        title: report.title,
        subtitle,
        sheetName: 'Enseignants',
        schoolName,
        columns: [
          { header: 'Matricule', key: 'matricule', width: 15 },
          { header: 'Nom complet', key: 'fullName', width: 30 },
          { header: 'Sexe', key: 'gender', width: 8 },
          { header: 'Spécialité', key: 'specialty', width: 20 },
          { header: 'Diplôme', key: 'diploma', width: 20 },
          { header: 'Contrat', key: 'contractType', width: 15 },
          { header: 'Matières', key: 'subjects', width: 40 },
        ],
        data: teachers.map((t) => ({
          matricule: t.matricule,
          fullName: t.fullName,
          gender: t.gender ?? '',
          specialty: t.specialty ?? '',
          diploma: t.diploma ?? '',
          contractType: t.contractType ?? '',
          subjects: (t.subjects ?? []).join(', '),
        })),
      };
    }

    // === RAP-05 : infrastructures ===
    if (report.code === 'RAP-05') {
      const salles: any[] = d.salles ?? [];
      return {
        title: report.title,
        subtitle,
        sheetName: 'Salles',
        schoolName,
        columns: [
          { header: 'Salle', key: 'name', width: 25 },
          { header: 'Type', key: 'type', width: 18 },
          { header: 'Capacité', key: 'capacity', width: 12 },
          { header: 'Emplacement', key: 'location', width: 25 },
          { header: 'Disponible', key: 'available', width: 12 },
          { header: 'Équipements', key: 'equipmentCount', width: 14 },
        ],
        data: salles.map((r) => ({
          name: r.name,
          type: r.type,
          capacity: r.capacity ?? '',
          location: r.location ?? '',
          available: r.isAvailable ? 'Oui' : 'Non',
          equipmentCount: r.equipmentCount ?? 0,
        })),
      };
    }

    // === RAP-06 : situation annuelle (synthese) ===
    if (report.code === 'RAP-06') {
      const peda = d.situationPedagogique ?? {};
      const mat = d.situationMaterielle ?? {};
      const admin = d.situationAdministrative ?? {};
      return {
        title: report.title,
        subtitle,
        sheetName: 'Synthèse',
        schoolName,
        columns: [
          { header: 'Rubrique', key: 'label', width: 40 },
          { header: 'Valeur', key: 'value', width: 40 },
        ],
        data: [
          { label: 'Statut établissement', value: admin.statutEtablissement ?? '—' },
          { label: 'Directeur', value: admin.directeur ?? '—' },
          { label: 'Classes ouvertes', value: admin.classesOuvertes ?? 0 },
          { label: 'Effectif total', value: peda.effectifsTotal ?? 0 },
          { label: 'Filles', value: peda.effectifsFilles ?? 0 },
          { label: 'Garçons', value: peda.effectifsGarcons ?? 0 },
          { label: 'Enseignants', value: peda.personnelEnseignant ?? 0 },
          { label: 'Salles totales', value: mat.sallesTotal ?? 0 },
          { label: 'Salles disponibles', value: mat.sallesDisponibles ?? 0 },
        ],
      };
    }

    // === RAP-07 : fin d'annee (resultats par classe) ===
    if (report.code === 'RAP-07') {
      const classes: any[] = d.resultatsParClasse ?? [];
      return {
        title: report.title,
        subtitle,
        sheetName: 'Resultats',
        schoolName,
        columns: [
          { header: 'Classe', key: 'className', width: 20 },
          { header: 'Niveau', key: 'levelName', width: 15 },
          { header: 'Total', key: 'total', width: 10 },
          { header: 'Admis', key: 'passed', width: 10 },
          { header: 'Redoublants', key: 'repeated', width: 12 },
          { header: 'Exclus', key: 'excluded', width: 10 },
          { header: 'Transférés', key: 'transferred', width: 12 },
        ],
        data: classes.map((c) => ({
          className: c.className,
          levelName: c.levelName,
          total: c.total,
          passed: c.passed,
          repeated: c.repeated,
          excluded: c.excluded,
          transferred: c.transferred,
        })),
      };
    }

    // === Fallback ===
    return {
      title: report.title,
      subtitle,
      sheetName: 'Donnees',
      schoolName,
      columns: [
        { header: 'Code', key: 'code', width: 15 },
        { header: 'Titre', key: 'title', width: 40 },
        { header: 'Statut', key: 'status', width: 20 },
      ],
      data: [{ code: report.code, title: report.title, status: report.status }],
    };
  }

  // ============================================================
  // RAP-09 : Validation + verrouillage + versions
  // ============================================================

  @Post('reports/:id/submit')
  async submit(@Req() req: any, @Param('id') id: string) {
    return this.service.submitForVerification(this.sid(req), this.uid(req), id);
  }

  @Post('reports/:id/validate')
  async validate(@Req() req: any, @Param('id') id: string) {
    return this.service.validateReport(this.sid(req), this.uid(req), id);
  }

  @Post('reports/:id/unlock')
  async unlock(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.service.unlockReport(this.sid(req), this.uid(req), id, body?.reason ?? '');
  }

  @Get('reports/:id/versions')
  async versions(@Req() req: any, @Param('id') id: string) {
    return this.service.listVersions(this.sid(req), id);
  }

  // ============================================================
  // RAP-10 : Transmission + réception
  // ============================================================

  @Post('reports/:id/transmit')
  async transmit(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.transmitReport(this.sid(req), this.uid(req), id, {
      recipient: body?.recipient,
      recipientRole: body?.recipientRole,
      channel: body?.channel ?? 'DEPOT_PHYSIQUE',
      proofUrl: body?.proofUrl,
      referenceNumber: body?.referenceNumber,
      observations: body?.observations,
    });
  }

  @Post('reports/:id/receive')
  async receive(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.receiveReport(this.sid(req), this.uid(req), id, {
      transmissionId: body?.transmissionId,
      receiptUrl: body?.receiptUrl,
      observations: body?.observations,
    });
  }

  @Get('reports/:id/transmissions')
  async transmissions(@Req() req: any, @Param('id') id: string) {
    return this.service.listTransmissions(this.sid(req), id);
  }

  // ============================================================
  // RAP-12 : Archivage
  // ============================================================

  @Get('archives')
  async listArchives(@Req() req: any, @Query() query: any) {
    return this.service.listArchives(this.sid(req), {
      academicYearId: query?.academicYearId,
      code: query?.code,
      status: query?.status,
      from: query?.from,
      to: query?.to,
    });
  }

  @Get('archives/export')
  async exportArchives(@Req() req: any, @Query() query: any, @Res() res: Response) {
    const data = await this.service.buildArchivesExportData(
      this.sid(req),
      query?.academicYearId,
    );

    const excel = await generateExcel({
      title: 'Archives des rapports',
      subtitle: 'Historique des rapports validés et transmis',
      sheetName: 'Archives',
      schoolName: req.user.schoolName ?? 'Établissement',
      columns: [
        { header: 'Code', key: 'code', width: 12 },
        { header: 'Titre', key: 'title', width: 40 },
        { header: 'Année scolaire', key: 'anneeScolaire', width: 16 },
        { header: 'Statut', key: 'statut', width: 20 },
        { header: 'Version', key: 'version', width: 10 },
        { header: 'Bordereau', key: 'bordereau', width: 25 },
        { header: 'Destinataire', key: 'destinataire', width: 25 },
        { header: 'Date validation', key: 'dateValidation', width: 16 },
        { header: 'Date transmission', key: 'dateTransmission', width: 16 },
      ],
      data,
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="archives-rapports-${Date.now()}.xlsx"`,
    );
    res.send(excel);
  }

  // ============================================================
  // RAP-11 : Calendrier + échéances
  // ============================================================

  @Get('deadlines')
  async listDeadlines(@Req() req: any, @Query() query: any) {
    return this.service.listDeadlines(this.sid(req), query?.academicYearId);
  }

  @Get('deadlines/upcoming')
  async listUpcoming(@Req() req: any, @Query() query: any) {
    const days = query?.days ? parseInt(query.days, 10) : 30;
    return this.service.listUpcomingDeadlines(this.sid(req), days);
  }

  @Post('deadlines')
  async createDeadline(@Req() req: any, @Body() body: any) {
    return this.service.createDeadline(this.sid(req), body);
  }

  @Patch('deadlines/:id')
  async patchDeadline(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.patchDeadline(this.sid(req), id, body);
  }

  @Delete('deadlines/:id')
  async deleteDeadline(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteDeadline(this.sid(req), id);
  }

  // ============================================================
  // RAP-13 : Tableau de bord
  // ============================================================

  @Get('dashboard')
  async dashboard(@Req() req: any, @Query() query: any) {
    return this.service.getDashboard(this.sid(req), query?.academicYearId);
  }

  // ============================================================
  // B15 : Mode institutionnel (CAP / Academie)
  // ============================================================

  @Get('institutional/status')
  async institutionalStatus(@Req() req: any) {
    return this.service.getInstitutionalStatus(this.sid(req));
  }

  @Post('institutional/enable')
  async institutionalEnable(@Req() req: any) {
    return this.service.setInstitutionalMode(this.sid(req), true);
  }

  @Post('institutional/disable')
  async institutionalDisable(@Req() req: any) {
    return this.service.setInstitutionalMode(this.sid(req), false);
  }

  @Get('institutional/consolidated')
  async institutionalConsolidated(@Req() req: any, @Query() query: any) {
    return this.service.getConsolidatedView(this.sid(req), query?.academicYearId);
  }

  // ============================================================
  // Helpers de transformation
  // ============================================================

  private buildPdfSummary(report: any): Array<{ label: string; value: string | number }> {
    const d = (report.data as any) ?? {};
    const s = d.synthese ?? {};

    // RAP-04 : personnel
    if (report.code === 'RAP-04') {
      return [
        { label: 'Enseignants', value: s.totalTeachers ?? 0 },
        { label: 'Personnel administratif', value: s.totalAdmin ?? 0 },
        { label: 'Enseignantes (F)', value: s.teachersByGender?.filles ?? 0 },
        { label: 'Enseignants (M)', value: s.teachersByGender?.garcons ?? 0 },
      ];
    }

    // RAP-05 : infrastructures
    if (report.code === 'RAP-05') {
      return [
        { label: 'Salles totales', value: s.totalRooms ?? 0 },
        { label: 'Salles disponibles', value: s.totalAvailable ?? 0 },
        { label: 'Salles de classe', value: s.classroomCount ?? 0 },
        { label: 'Capacité totale', value: s.totalCapacity ?? 0 },
      ];
    }

    // RAP-06 : situation annuelle
    if (report.code === 'RAP-06') {
      const peda = d.situationPedagogique ?? {};
      const mat = d.situationMaterielle ?? {};
      return [
        { label: 'Élèves', value: peda.effectifsTotal ?? 0 },
        { label: 'Classes', value: peda.nombreClasses ?? 0 },
        { label: 'Enseignants', value: peda.personnelEnseignant ?? 0 },
        { label: 'Salles', value: mat.sallesTotal ?? 0 },
      ];
    }

    // RAP-07 : fin d'annee
    if (report.code === 'RAP-07') {
      return [
        { label: 'Élèves évalués', value: s.totalEvaluated ?? 0 },
        { label: 'Admis', value: s.passed ?? 0 },
        { label: 'Redoublants', value: s.repeated ?? 0 },
        { label: 'Taux de réussite', value: (d.taux?.tauxReussite ?? 0) + ' %' },
      ];
    }

    // Par defaut : effectifs eleves (RAP-02, RAP-03)
    return [
      { label: 'Élèves inscrits', value: s.totalStudents ?? 0 },
      { label: 'Filles', value: s.totalGirls ?? 0 },
      { label: 'Garçons', value: s.totalBoys ?? 0 },
      { label: 'Classes ouvertes', value: s.classesCount ?? 0 },
    ];
  }

  private buildPdfSections(report: any): Array<{ title: string; rows: any[]; columns: any[] }> {
    const d = (report.data as any) ?? {};
    const sections: Array<{ title: string; rows: any[]; columns: any[] }> = [];

    // Section : infos ecole
    const school = d.identification?.school ?? d.reference?.school;
    if (school) {
      sections.push({
        title: 'Identification de l\'établissement',
        rows: [
          { label: 'Nom', value: school.name ?? '—' },
          { label: 'Code', value: school.code ?? '—' },
          { label: 'Type', value: school.type ?? '—' },
          { label: 'Région', value: school.region ?? '—' },
          { label: 'CAP', value: school.cap ?? '—' },
          { label: 'Académie', value: school.academy ?? '—' },
          { label: 'Directeur', value: school.directorName ?? '—' },
        ],
        columns: [
          { key: 'label', label: 'Champ' },
          { key: 'value', label: 'Valeur' },
        ],
      });
    }

    // Section : effectifs par classe
    const classes = d.classes ?? d.effectifsParClasse;
    if (Array.isArray(classes) && classes.length > 0) {
      sections.push({
        title: 'Effectifs par classe',
        rows: classes,
        columns: [
          { key: 'className', label: 'Classe' },
          { key: 'levelName', label: 'Niveau' },
          { key: 'total', label: 'Total', align: 'right' },
          { key: 'girls', label: 'Filles', align: 'right' },
          { key: 'boys', label: 'Garçons', align: 'right' },
        ],
      });
    }

    // Section : repartition par cycle
    const cycles = d.parCycle ?? d.repartitionParCycle;
    if (cycles && typeof cycles === 'object') {
      const rows = Object.entries(cycles).map(([k, v]: any) => ({
        cycle: k,
        classes: v.classes,
        total: v.total,
        girls: v.girls,
        boys: v.boys,
      }));
      sections.push({
        title: 'Répartition par cycle',
        rows,
        columns: [
          { key: 'cycle', label: 'Cycle' },
          { key: 'classes', label: 'Classes', align: 'right' },
          { key: 'total', label: 'Total', align: 'right' },
          { key: 'girls', label: 'Filles', align: 'right' },
          { key: 'boys', label: 'Garçons', align: 'right' },
        ],
      });
    }

    // ============================================================
    // RAP-04 : personnel
    // ============================================================
    if (report.code === 'RAP-04') {
      // Section : liste des enseignants
      if (Array.isArray(d.enseignants) && d.enseignants.length > 0) {
        sections.push({
          title: 'Liste des enseignants',
          rows: d.enseignants.map((t: any) => ({
            matricule: t.matricule,
            nom: t.fullName,
            diplome: t.diploma ?? '—',
            contrat: t.contractType ?? '—',
            matieres: (t.subjects ?? []).join(', '),
          })),
          columns: [
            { key: 'matricule', label: 'Matricule' },
            { key: 'nom', label: 'Nom' },
            { key: 'diplome', label: 'Diplôme' },
            { key: 'contrat', label: 'Contrat' },
            { key: 'matieres', label: 'Matières' },
          ],
        });
      }

      // Section : repartition par matiere
      if (d.repartitionParMatiere && typeof d.repartitionParMatiere === 'object') {
        const rows = Object.entries(d.repartitionParMatiere).map(([k, v]) => ({
          matiere: k,
          count: v,
        }));
        sections.push({
          title: 'Répartition des enseignants par matière',
          rows,
          columns: [
            { key: 'matiere', label: 'Matière' },
            { key: 'count', label: 'Nb enseignants', align: 'right' },
          ],
        });
      }

      // Section : repartition par diplome
      if (d.repartitionParDiplome && typeof d.repartitionParDiplome === 'object') {
        const rows = Object.entries(d.repartitionParDiplome).map(([k, v]) => ({
          diplome: k,
          count: v,
        }));
        sections.push({
          title: 'Répartition par diplôme',
          rows,
          columns: [
            { key: 'diplome', label: 'Diplôme' },
            { key: 'count', label: 'Nb', align: 'right' },
          ],
        });
      }

      // Section : personnel administratif
      if (Array.isArray(d.personnelAdministratif) && d.personnelAdministratif.length > 0) {
        sections.push({
          title: 'Personnel administratif',
          rows: d.personnelAdministratif.map((u: any) => ({
            nom: u.fullName,
            roles: (u.roles ?? []).join(', '),
            email: u.email ?? '—',
            phone: u.phone ?? '—',
          })),
          columns: [
            { key: 'nom', label: 'Nom' },
            { key: 'roles', label: 'Rôle(s)' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Téléphone' },
          ],
        });
      }

      return sections;
    }

    // ============================================================
    // RAP-05 : infrastructures
    // ============================================================
    if (report.code === 'RAP-05') {
      // Section : detail des salles
      if (Array.isArray(d.salles) && d.salles.length > 0) {
        sections.push({
          title: 'Détail des salles',
          rows: d.salles.map((r: any) => ({
            name: r.name,
            type: r.type,
            capacity: r.capacity ?? '—',
            location: r.location ?? '—',
            available: r.isAvailable ? 'Oui' : 'Non',
            equipment: r.equipmentCount ?? 0,
          })),
          columns: [
            { key: 'name', label: 'Salle' },
            { key: 'type', label: 'Type' },
            { key: 'capacity', label: 'Capacité', align: 'right' },
            { key: 'location', label: 'Emplacement' },
            { key: 'available', label: 'Dispo' },
            { key: 'equipment', label: 'Équip.', align: 'right' },
          ],
        });
      }

      // Section : repartition par type
      if (d.repartitionParType && typeof d.repartitionParType === 'object') {
        const rows = Object.entries(d.repartitionParType).map(([k, v]: any) => ({
          type: k,
          count: v.count,
          capacity: v.capacity,
          available: v.available,
        }));
        sections.push({
          title: 'Répartition par type',
          rows,
          columns: [
            { key: 'type', label: 'Type' },
            { key: 'count', label: 'Nb', align: 'right' },
            { key: 'capacity', label: 'Capacité', align: 'right' },
            { key: 'available', label: 'Dispo', align: 'right' },
          ],
        });
      }

      // Section : equipements agreges
      if (d.equipements && typeof d.equipements === 'object') {
        const entries = Object.entries(d.equipements);
        if (entries.length > 0) {
          const rows = entries.map(([k, v]) => ({ name: k, count: v }));
          sections.push({
            title: 'Équipements (agrégés)',
            rows,
            columns: [
              { key: 'name', label: 'Équipement' },
              { key: 'count', label: 'Quantité', align: 'right' },
            ],
          });
        }
      }

      return sections;
    }

    // ============================================================
    // RAP-06 : situation annuelle
    // ============================================================
    if (report.code === 'RAP-06') {
      // Section : situation administrative
      const admin = d.situationAdministrative ?? {};
      sections.push({
        title: 'A. Situation administrative',
        rows: [
          { label: 'Statut établissement', value: admin.statutEtablissement ?? '—' },
          { label: 'Type', value: admin.typeEtablissement ?? '—' },
          { label: 'Autorisation', value: admin.autorisation ?? '—' },
          { label: 'Directeur', value: admin.directeur ?? '—' },
          { label: 'Classes ouvertes', value: admin.classesOuvertes ?? 0 },
          { label: 'Ordres d\'enseignement', value: (admin.ordresEnseignement ?? []).join(', ') },
        ],
        columns: [
          { key: 'label', label: 'Rubrique' },
          { key: 'value', label: 'Valeur' },
        ],
      });

      // Section : situation pédagogique
      const peda = d.situationPedagogique ?? {};
      sections.push({
        title: 'B. Situation pédagogique',
        rows: [
          { label: 'Effectif total', value: peda.effectifsTotal ?? 0 },
          { label: 'Filles', value: peda.effectifsFilles ?? 0 },
          { label: 'Garçons', value: peda.effectifsGarcons ?? 0 },
          { label: 'Nombre de classes', value: peda.nombreClasses ?? 0 },
          { label: 'Enseignants', value: peda.personnelEnseignant ?? 0 },
          { label: 'Personnel administratif', value: peda.personnelAdministratif ?? 0 },
        ],
        columns: [
          { key: 'label', label: 'Rubrique' },
          { key: 'value', label: 'Valeur' },
        ],
      });

      // Section : situation matérielle
      const mat = d.situationMaterielle ?? {};
      sections.push({
        title: 'C. Situation matérielle',
        rows: [
          { label: 'Salles totales', value: mat.sallesTotal ?? 0 },
          { label: 'Salles disponibles', value: mat.sallesDisponibles ?? 0 },
          { label: 'Salles de classe', value: mat.sallesClasse ?? 0 },
          { label: 'Capacité totale', value: mat.capaciteTotale ?? 0 },
        ],
        columns: [
          { key: 'label', label: 'Rubrique' },
          { key: 'value', label: 'Valeur' },
        ],
      });

      // Section : situation morale (peut etre vide)
      const morale = d.situationMorale ?? {};
      const moraleRows = [
        { label: 'Règlement intérieur', value: morale.reglementInterieur || '—' },
        { label: 'Application', value: morale.applicationReglement || '—' },
        { label: 'Vie scolaire', value: morale.organisationVieScolaire || '—' },
        { label: 'Actions de sensibilisation', value: morale.actionsSensibilisation || '—' },
        { label: 'Activités éducatives', value: morale.activitesEducatives || '—' },
      ];
      sections.push({
        title: 'D. Situation morale et vie scolaire',
        rows: moraleRows,
        columns: [
          { key: 'label', label: 'Rubrique' },
          { key: 'value', label: 'Valeur' },
        ],
      });

      // Section : perspectives
      const persp = d.perspectives ?? {};
      sections.push({
        title: 'E. Difficultés et perspectives',
        rows: [
          { label: 'Difficultés rencontrées', value: persp.difficultesRencontrees || '—' },
          { label: 'Mesures prises', value: persp.mesuresPrises || '—' },
          { label: 'Besoins identifiés', value: persp.besoinsIdentifies || '—' },
          { label: 'Plan d\'amélioration', value: persp.planAmelioration || '—' },
          { label: 'Projets année suivante', value: persp.projetsAnneeSuivante || '—' },
        ],
        columns: [
          { key: 'label', label: 'Rubrique' },
          { key: 'value', label: 'Valeur' },
        ],
      });

      // Section : validation
      const val = d.validation ?? {};
      sections.push({
        title: 'F. Validation',
        rows: [
          { label: 'Responsable', value: val.responsableNom ?? '—' },
          { label: 'Fonction', value: val.responsableFonction ?? '—' },
          { label: 'Date', value: val.dateValidation ?? '—' },
        ],
        columns: [
          { key: 'label', label: 'Rubrique' },
          { key: 'value', label: 'Valeur' },
        ],
      });

      return sections;
    }

    // ============================================================
    // RAP-07 : fin d'annee
    // ============================================================
    if (report.code === 'RAP-07') {
      // Section : synthese
      const syn = d.synthese ?? {};
      sections.push({
        title: 'Synthèse de fin d\'année',
        rows: [
          { label: 'Effectif début d\'année', value: syn.effectifDebut ?? 0 },
          { label: 'Effectif évalué (fin)', value: syn.totalEvaluated ?? 0 },
          { label: 'Admis en classe supérieure', value: syn.passed ?? 0 },
          { label: 'Redoublants', value: syn.repeated ?? 0 },
          { label: 'Exclus', value: syn.excluded ?? 0 },
          { label: 'Transférés', value: syn.transferred ?? 0 },
          { label: 'En attente de décision', value: syn.undecided ?? 0 },
        ],
        columns: [
          { key: 'label', label: 'Rubrique' },
          { key: 'value', label: 'Valeur' },
        ],
      });

      // Section : taux
      const taux = d.taux ?? {};
      sections.push({
        title: 'Taux',
        rows: [
          { label: 'Taux de réussite', value: (taux.tauxReussite ?? '—') + (taux.tauxReussite != null ? ' %' : '') },
          { label: 'Taux de redoublement', value: (taux.tauxRedoublement ?? '—') + (taux.tauxRedoublement != null ? ' %' : '') },
          { label: 'Taux d\'exclusion', value: (taux.tauxExclusion ?? '—') + (taux.tauxExclusion != null ? ' %' : '') },
          { label: 'Taux de transfert', value: (taux.tauxTransfert ?? '—') + (taux.tauxTransfert != null ? ' %' : '') },
        ],
        columns: [
          { key: 'label', label: 'Indicateur' },
          { key: 'value', label: 'Valeur' },
        ],
      });

      // Section : resultats par classe
      if (Array.isArray(d.resultatsParClasse) && d.resultatsParClasse.length > 0) {
        sections.push({
          title: 'Résultats par classe',
          rows: d.resultatsParClasse.map((c: any) => ({
            classe: c.className,
            total: c.total,
            admis: c.passed,
            redoublants: c.repeated,
            exclus: c.excluded,
            transferes: c.transferred,
          })),
          columns: [
            { key: 'classe', label: 'Classe' },
            { key: 'total', label: 'Total', align: 'right' },
            { key: 'admis', label: 'Admis', align: 'right' },
            { key: 'redoublants', label: 'Redouble', align: 'right' },
            { key: 'exclus', label: 'Exclus', align: 'right' },
            { key: 'transferes', label: 'Transférés', align: 'right' },
          ],
        });
      }

      return sections;
    }

    return sections;
  }
}
