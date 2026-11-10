import { Module } from "@nestjs/common";
import { ClassPdfModule } from './class-pdf/class-pdf.module';
import { ReportCardsController } from "./report-cards.controller";
import { ReportCardsService } from "./report-cards.service";
import { AnnualResultsController } from "./annual-results.controller";
import { AnnualResultsService } from "./annual-results.service";
import { DashboardModule } from "../dashboard/dashboard.module";
import { VerificationModule } from "../verification/verification.module";
import { PdfModule } from "../common/pdf";
import { AttendanceModule } from "../attendance/attendance.module";

@Module({
  imports: [ClassPdfModule, DashboardModule, VerificationModule, PdfModule, AttendanceModule],
  controllers: [ReportCardsController, AnnualResultsController],
  providers: [ReportCardsService, AnnualResultsService],
  exports: [ReportCardsService, AnnualResultsService],
})
export class ReportCardsModule {}