import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { AdminReportTemplatesSeed } from './admin-report-templates.seed';
import { ReportDataBuilder } from './report-data.builder';
import { PdfModule } from '../common/pdf';

@Module({
  imports: [PrismaModule, PdfModule],
  controllers: [AdminReportsController],
  providers: [AdminReportsService, AdminReportTemplatesSeed, ReportDataBuilder],
  exports: [AdminReportsService, AdminReportTemplatesSeed, ReportDataBuilder],
})
export class AdminReportsModule {}
