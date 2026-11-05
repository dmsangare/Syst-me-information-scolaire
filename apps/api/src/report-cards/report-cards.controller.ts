import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Res,
  HttpCode, HttpStatus, UseGuards, NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Response } from "express";
import { ReportCardsService } from "./report-cards.service";
import { generateReportCardPDF } from './utils/report-card-pdf.util';
import { generateAnnualReportCardPDF } from './utils/annual-report-card-pdf.util';
import { PdfGeneratorService } from '../common/pdf';
import { ReportCardGenerateSchema, ReportCardUpdateSchema, ReportCardReopenSchema } from "./dto";
import { ZodValidationPipe } from "../common/pipes";
import { RequirePermissions, CurrentUser, CurrentUserPayload } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";
import { PaginationDto } from "../common/dto/pagination.dto";

@ApiTags("ReportCards")
@ApiBearerAuth("access-token")
@Controller("report-cards")
@UseGuards(SchoolScopeGuard)
export class ReportCardsController {
  constructor(
    private readonly service: ReportCardsService,
    private readonly pdfGenerator: PdfGeneratorService,
  ) {}

  @Get()
  @RequirePermissions("report_card:view")
  @ApiOperation({ summary: "Liste des bulletins" })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: PaginationDto,
    @Query("termId") termId?: string,
    @Query("classId") classId?: string,
    @Query("studentId") studentId?: string,
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;
    return this.service.findAll(schoolId, query.page, query.limit, termId, classId, studentId, user);
  }

  @Get(":id")
  @RequirePermissions("report_card:view")
  async findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Get("student/:studentId/term/:termId")
  @RequirePermissions("report_card:view")
  @ApiOperation({ summary: "Bulletin d un eleve pour un trimestre" })
  async getStudentReport(@Param("studentId") studentId: string, @Param("termId") termId: string) {
    return this.service.getStudentReport(studentId, termId);
  }

  @Get("class/:classId/term/:termId/ranking")
  @RequirePermissions("report_card:view")
  @ApiOperation({ summary: "Classement d une classe" })
  async getClassRanking(@Param("classId") classId: string, @Param("termId") termId: string) {
    return this.service.getClassRanking(classId, termId);
  }

  @Post("generate")
  @RequirePermissions("report_card:create")
  @ApiOperation({ summary: "Generer les bulletins (calcul auto des moyennes et rangs)" })
  async generate(
    @Body(new ZodValidationPipe(ReportCardGenerateSchema)) dto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.generate(dto, user);
  }

  @Patch(":id")
  @RequirePermissions("report_card:update")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ReportCardUpdateSchema)) dto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Post(":id/validate")
  @RequirePermissions("report_card:update")
  @ApiOperation({ summary: "Valider un bulletin" })
  async validate(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.validate(id, user);
  }

  @Post(":id/publish")
  @RequirePermissions("report_card:update")
  @ApiOperation({ summary: "Publier un bulletin" })
  async publish(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.publish(id, user);
  }

  @Post("class/:classId/term/:termId/publish")
  @RequirePermissions("report_card:update")
  @ApiOperation({ summary: "Publier tous les bulletins d une classe" })
  async publishByClass(@Param("classId") classId: string, @Param("termId") termId: string) {
    return this.service.publishByClass(classId, termId);
  }

  @Post(":id/reopen")
  @RequirePermissions("report_card:update")
  @ApiOperation({ summary: "Rouvrir un bulletin valide/publie (motif obligatoire)" })
  async reopen(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ReportCardReopenSchema)) dto: { motive: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.reopen(id, dto.motive, user);
  }

  @Get(":id/export/pdf-annual")
  @RequirePermissions("report_card:export")
  @ApiOperation({ summary: "Exporter le bulletin ANNUEL en PDF" })
  async exportAnnualPDF(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    const data = await this.service.getAnnualExportData(id, user);
    const buffer = await generateAnnualReportCardPDF(data as any, this.pdfGenerator);
    const safeName = data.studentName.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 40);
    const filename = `bulletin-annuel-${safeName}-${data.academicYear.replace(/\s+/g, "-")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get(":id/export/pdf")
  @RequirePermissions("report_card:export")
  @ApiOperation({ summary: "Exporter le bulletin en PDF" })
  async exportPDF(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    const data = await this.service.getExportData(id, user);
    const buffer = await generateReportCardPDF(data as any, this.pdfGenerator);

    const safeName = data.studentName
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()
      .slice(0, 40);
    const filename = `bulletin-${safeName}-${data.termName.replace(/\s+/g, "-").toLowerCase()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("report_card:delete")
  async remove(@Param("id") id: string) {
    await this.service.remove(id);
  }

  @Patch(":id/clear-absences")
  @RequirePermissions("report_card:update")
  @ApiOperation({ summary: "Marquer l'absence comme traitée (débloque le bulletin)" })
  async clearAbsences(
    @Param("id") id: string,
    @Body() body: { motive: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.clearAbsences(id, body.motive, user);
  }
}
