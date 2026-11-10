import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators';
import { ExportService, ExcelSheet } from './export.service';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly service: ExportService) {}

  /**
   * POST /api/v1/export/excel
   * Body : { filename: string, sheets: [{ name, rows }] }
   * Retourne un .xlsx (blob).
   */
  @Post('excel')
  @RequirePermissions('student:export', 'report_card:export', 'assessment:export')
  async excel(
    @Body() body: { filename: string; sheets: ExcelSheet[] },
    @Res() res: Response,
  ) {
    const filename = (body?.filename ?? 'export').replace(/[^a-zA-Z0-9-_]/g, '_');
    const sheets = body?.sheets ?? [];

    const buffer = await this.service.generateExcel(sheets);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    );
    res.send(buffer);
  }
}