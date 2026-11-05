import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { generateReportPDF } from './pdf/report-pdf.util';
import { PdfGeneratorService } from '../common/pdf';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private service: ReportsService,
    private pdfGenerator: PdfGeneratorService,
  ) {}

  private sid(req: any) {
    return req.user.schoolId;
  }

  @Get('dashboard')
  dashboard(@Req() req: any, @Query('academicYearId') academicYearId?: string) {
    return this.service.getDashboard(this.sid(req), academicYearId);
  }

  @Get('financial')
  financial(@Req() req: any, @Query('academicYearId') academicYearId?: string) {
    return this.service.getFinancial(this.sid(req), academicYearId);
  }

  @Get('unpaid')
  unpaid(@Req() req: any, @Query('classId') classId?: string) {
    return this.service.getUnpaid(this.sid(req), classId);
  }

  @Get('students')
  students(@Req() req: any, @Query('academicYearId') academicYearId?: string) {
    return this.service.getStudents(this.sid(req), academicYearId);
  }

  @Get('pedagogical')
  pedagogical(@Req() req: any, @Query('termId') termId?: string) {
    return this.service.getPedagogicalStats(this.sid(req), termId);
  }

  @Get('attendance')
  attendance(@Req() req: any, @Query('classId') classId?: string, @Query('termId') termId?: string) {
    return this.service.getAttendance(this.sid(req), classId, termId);
  }

  @Get('classes')
  classes(@Req() req: any) {
    return this.service.getClassesComparison(this.sid(req));
  }

  @Get('monthly')
  monthly(@Req() req: any) {
    return this.service.getMonthlyEvolution(this.sid(req));
  }

  // ============================================================
  // PDF — FINANCIER
  // ============================================================
  @Get('pdf/financial')
  async pdfFinancial(@Req() req: any, @Res() res: Response) {
    const data = (await this.service.getFinancial(this.sid(req))).data;
    const schoolName = req.user.schoolName ?? 'École';

    const pdf = await generateReportPDF({
      title: 'Rapport financier',
      schoolName,
      subtitle: 'Situation des recettes et impayés',
      user: `${req.user.firstName} ${req.user.lastName}`,
      summary: [
        { label: 'Total facturé', value: new Intl.NumberFormat('fr-FR').format(data.totalBilled) + ' FCFA' },
        { label: 'Encaissé', value: new Intl.NumberFormat('fr-FR').format(data.totalPaid) + ' FCFA' },
        { label: 'Impayés', value: new Intl.NumberFormat('fr-FR').format(data.totalUnpaid) + ' FCFA' },
        { label: 'Taux recouvrement', value: data.recoveryRate.toFixed(1) + ' %' },
      ],
      sections: [
        {
          title: 'Recettes par mois',
          rows: data.byMonth,
          columns: [
            { key: 'month', label: 'Mois' },
            { key: 'amount', label: 'Montant', align: 'right', format: 'currency' },
          ],
        },
        {
          title: 'Recettes par catégorie',
          rows: data.byCategory,
          columns: [
            { key: 'category', label: 'Catégorie' },
            { key: 'amount', label: 'Montant', align: 'right', format: 'currency' },
          ],
        },
        {
          title: 'Recettes par méthode de paiement',
          rows: data.byMethod,
          columns: [
            { key: 'method', label: 'Méthode' },
            { key: 'count', label: 'Nombre', align: 'right' },
            { key: 'total', label: 'Total', align: 'right', format: 'currency' },
          ],
        },
      ],
    }, this.pdfGenerator);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-financier-${Date.now()}.pdf"`,
      'Content-Length': pdf.length.toString(),
    });
    res.end(pdf);
  }

  // ============================================================
  // PDF — IMPAYÉS
  // ============================================================
  @Get('pdf/unpaid')
  async pdfUnpaid(@Req() req: any, @Res() res: Response) {
    const data = (await this.service.getUnpaid(this.sid(req))).data;
    const schoolName = req.user.schoolName ?? 'École';

    const pdf = await generateReportPDF({
      title: 'Rapport des impayés',
      schoolName,
      subtitle: `${data.count} facture(s) non soldée(s)`,
      user: `${req.user.firstName} ${req.user.lastName}`,
      summary: [
        { label: 'Total impayés', value: new Intl.NumberFormat('fr-FR').format(data.totalOutstanding) + ' FCFA' },
        { label: 'Factures', value: data.count },
      ],
      sections: [
        {
          title: 'Impayés par classe',
          rows: data.byClass,
          columns: [
            { key: 'className', label: 'Classe' },
            { key: 'count', label: 'Nb factures', align: 'right' },
            { key: 'total', label: 'Montant', align: 'right', format: 'currency' },
          ],
        },
        {
          title: 'Détail des impayés',
          rows: data.items.map((i: any) => ({
            number: i.number,
            studentName: i.studentName,
            className: i.className,
            totalAmount: i.totalAmount,
            paidAmount: i.paidAmount,
            balance: i.balance,
          })),
          columns: [
            { key: 'number', label: 'Facture' },
            { key: 'studentName', label: 'Élève' },
            { key: 'className', label: 'Classe' },
            { key: 'totalAmount', label: 'Total', align: 'right', format: 'currency' },
            { key: 'paidAmount', label: 'Payé', align: 'right', format: 'currency' },
            { key: 'balance', label: 'Reste', align: 'right', format: 'currency' },
          ],
        },
      ],
    }, this.pdfGenerator);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-impayes-${Date.now()}.pdf"`,
      'Content-Length': pdf.length.toString(),
    });
    res.end(pdf);
  }

  // ============================================================
  // PDF — EFFECTIFS
  // ============================================================
  @Get('pdf/students')
  async pdfStudents(@Req() req: any, @Res() res: Response) {
    const data = (await this.service.getStudents(this.sid(req))).data;
    const schoolName = req.user.schoolName ?? 'École';

    const pdf = await generateReportPDF({
      title: 'Rapport des effectifs',
      schoolName,
      subtitle: 'Répartition des élèves',
      user: `${req.user.firstName} ${req.user.lastName}`,
      summary: [
        { label: 'Total élèves', value: data.total },
        { label: 'Garçons', value: data.boys },
        { label: 'Filles', value: data.girls },
      ],
      sections: [
        {
          title: 'Effectifs par niveau',
          rows: data.byLevel,
          columns: [
            { key: 'code', label: 'Code' },
            { key: 'name', label: 'Niveau' },
            { key: 'count', label: 'Total', align: 'right' },
            { key: 'boys', label: 'Garçons', align: 'right' },
            { key: 'girls', label: 'Filles', align: 'right' },
          ],
        },
        {
          title: 'Effectifs par classe',
          rows: data.byClass,
          columns: [
            { key: 'className', label: 'Classe' },
            { key: 'levelName', label: 'Niveau' },
            { key: 'count', label: 'Total', align: 'right' },
            { key: 'boys', label: 'Garçons', align: 'right' },
            { key: 'girls', label: 'Filles', align: 'right' },
          ],
        },
      ],
    }, this.pdfGenerator);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-effectifs-${Date.now()}.pdf"`,
      'Content-Length': pdf.length.toString(),
    });
    res.end(pdf);
  }

  // ============================================================
  // PDF — PÉDAGOGIQUE
  // ============================================================
  @Get('pdf/pedagogical')
  async pdfPedagogical(@Req() req: any, @Res() res: Response) {
    const data = (await this.service.getPedagogicalStats(this.sid(req))).data;
    const schoolName = req.user.schoolName ?? 'École';

    const pdf = await generateReportPDF({
      title: 'Rapport pédagogique',
      schoolName,
      subtitle: 'Moyennes et résultats',
      user: `${req.user.firstName} ${req.user.lastName}`,
      summary: [
        { label: 'Notes saisies', value: data.totalGrades },
        { label: 'Taux de réussite', value: data.successRate.toFixed(1) + ' %' },
      ],
      sections: [
        {
          title: 'Moyennes par matière',
          rows: data.bySubject.map((s: any) => ({
            subject: s.subject,
            count: s.count,
            avgPct: s.avgPct,
            minPct: s.minPct,
            maxPct: s.maxPct,
          })),
          columns: [
            { key: 'subject', label: 'Matière' },
            { key: 'count', label: 'Notes', align: 'right' },
            { key: 'avgPct', label: 'Moyenne', align: 'right', format: 'percent' },
            { key: 'minPct', label: 'Min', align: 'right', format: 'percent' },
            { key: 'maxPct', label: 'Max', align: 'right', format: 'percent' },
          ],
        },
        {
          title: 'Moyennes par classe',
          rows: data.byClass.map((c: any) => ({
            className: c.className,
            count: c.count,
            avgPct: c.avgPct,
          })),
          columns: [
            { key: 'className', label: 'Classe' },
            { key: 'count', label: 'Notes', align: 'right' },
            { key: 'avgPct', label: 'Moyenne', align: 'right', format: 'percent' },
          ],
        },
      ],
    }, this.pdfGenerator);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-pedagogique-${Date.now()}.pdf"`,
      'Content-Length': pdf.length.toString(),
    });
    res.end(pdf);
  }

  // ============================================================
  // PDF — PRÉSENCES
  // ============================================================
  @Get('pdf/attendance')
  async pdfAttendance(@Req() req: any, @Res() res: Response) {
    const data = (await this.service.getAttendance(this.sid(req))).data;
    const schoolName = req.user.schoolName ?? 'École';

    const pdf = await generateReportPDF({
      title: 'Rapport des présences',
      schoolName,
      subtitle: 'Assiduité et absences',
      user: `${req.user.firstName} ${req.user.lastName}`,
      summary: [
        { label: 'Sessions', value: data.sessionsCount },
        { label: 'Taux de présence', value: data.presenceRate + ' %' },
        { label: 'Présents', value: data.present },
        { label: 'Absents', value: data.absent },
      ],
      sections: [
        {
          title: 'Présences par classe',
          rows: data.byClass.map((c: any) => ({
            className: c.className,
            sessionsCount: c.sessionsCount,
            present: c.present,
            absent: c.absent,
            late: c.late,
            presenceRate: c.presenceRate,
          })),
          columns: [
            { key: 'className', label: 'Classe' },
            { key: 'sessionsCount', label: 'Sessions', align: 'right' },
            { key: 'present', label: 'Présents', align: 'right' },
            { key: 'absent', label: 'Absents', align: 'right' },
            { key: 'late', label: 'Retards', align: 'right' },
            { key: 'presenceRate', label: 'Taux', align: 'right', format: 'percent' },
          ],
        },
      ],
    }, this.pdfGenerator);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-presences-${Date.now()}.pdf"`,
      'Content-Length': pdf.length.toString(),
    });
    res.end(pdf);
  }
}
