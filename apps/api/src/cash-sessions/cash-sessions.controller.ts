import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CashSessionsService } from './cash-sessions.service';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { generateCashSessionPDF } from './utils/cash-session-pdf.util';
import { PdfGeneratorService } from '../common/pdf';
import { loadLogoAsBase64 } from '../common/utils/load-logo.util';
import { fileToBase64 } from '../common/utils/file-to-base64.util';

@Controller('cash-sessions')
@UseGuards(JwtAuthGuard)
export class CashSessionsController {
  constructor(
    private service: CashSessionsService,
    private pdfGenerator: PdfGeneratorService,
  ) {}

  @Get('current')
  @RequirePermissions('cash:view')
  current(@Req() req: any) {
    return this.service.getCurrent(req.user.schoolId, req.user.id);
  }

  @Post('open')
  @RequirePermissions('cash:create')
  open(@Req() req: any, @Body() dto: OpenCashSessionDto) {
    return this.service.open(req.user.schoolId, req.user.id, dto);
  }

  @Post('close')
  @RequirePermissions('cash:close')
  close(@Req() req: any, @Body() dto: CloseCashSessionDto) {
    return this.service.close(req.user.schoolId, req.user.id, dto);
  }

  @Get('history')
  @RequirePermissions('cash:view')
  history(@Req() req: any, @Query() query: any) {
    return this.service.history(req.user.schoolId, query);
  }

  @Get(':id')
  @RequirePermissions('cash:view')
  detail(@Req() req: any, @Param('id') id: string) {
    return this.service.detail(req.user.schoolId, id);
  }

  @Get(':id/pdf')
  @RequirePermissions('cash:print')
  async pdf(
    @Req() req: any,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.service.detail(req.user.schoolId, id);

    // ... (le reste du code PDF reste inchangé)
    const movements = [
      ...(session.payments || []).map((p: any) => ({
        time: new Date(p.paidAt).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        type: 'IN' as const,
        label: p.student
          ? `${p.student.lastName} ${p.student.firstName}`
          : 'Encaissement',
        detail: p.invoice ? `Facture ${p.invoice.number}` : undefined,
        amount: Number(p.amount),
        method: p.method,
        date: new Date(p.paidAt),
      })),
      ...(session.expenses || []).map((e: any) => ({
        time: new Date(e.spentAt).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        type: 'OUT' as const,
        label: e.category
          ? `${e.category.emoji || ''} ${e.category.name}`
          : 'Depense',
        detail: e.description,
        amount: Number(e.amount),
        method: 'Especes',
        date: new Date(e.spentAt),
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    const cashierName = session.cashier
      ? `${session.cashier.firstName} ${session.cashier.lastName}`
      : 'Caissier';

    const schoolLogoBase64 = await loadLogoAsBase64(session.school?.logoUrl);
    const schoolStampBase64 = await fileToBase64(session.school?.stampUrl);

    const pdfBuffer = await generateCashSessionPDF({
      schoolName: session.school?.name || 'Ecole',
      schoolLogoBase64,
      schoolStampBase64,
      schoolSigle: session.school?.sigle,
      schoolAddress: session.school?.address,
      schoolPhone: session.school?.phone,
      schoolMotto: session.school?.motto,
      sessionId: session.id,
      cashierName,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openingAmount: Number(session.openingAmount),
      totalCash: session.totalCash || 0,
      totalOther: session.totalOther || 0,
      totalExpenses: session.totalExpenses || 0,
      paymentsCount: session.paymentsCount || 0,
      expensesCount: session.expensesCount || 0,
      theoreticalBalance: session.theoreticalBalance || 0,
      closingAmount: session.closingAmount
        ? Number(session.closingAmount)
        : null,
      difference: session.difference ? Number(session.difference) : null,
      movements,
    }, this.pdfGenerator);

    const filename = `rapport-caisse-${session.id.slice(0, 8)}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    return new StreamableFile(pdfBuffer);
  }
}