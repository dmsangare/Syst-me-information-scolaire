import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Res,
  HttpCode, HttpStatus, UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Response } from "express";
import { AssessmentsService } from "./assessments.service";
import { generateAssessmentPDF, generateAssessmentExcel, generateAssessmentCSV } from "./utils/assessment-export.util";
import { AssessmentCreateSchema, AssessmentUpdateSchema } from "./dto";
import { ZodValidationPipe } from "../common/pipes";
import { RequirePermissions, CurrentUser, CurrentUserPayload } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";

@ApiTags("Assessments")
@ApiBearerAuth("access-token")
@Controller("assessments")
@UseGuards(SchoolScopeGuard)
export class AssessmentsController {
  constructor(private readonly service: AssessmentsService) {}

  /**
   * Renvoie le schoolId effectif pour filtrer (null pour SUPER_ADMIN = pas de filtre).
   */
  private getSchoolScope(user: CurrentUserPayload): string | null {
    return user.roles?.includes("SUPER_ADMIN") ? null : (user.schoolId ?? null);
  }

  // ============================================================
  // CRUD
  // ============================================================

  @Get()
  @RequirePermissions("assessment:view")
  @ApiOperation({ summary: "Liste des evaluations" })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: any,
  ) {
    const schoolId = this.getSchoolScope(user);
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 200);

    return this.service.findAll(schoolId, page, limit, {
      classId: query.classId,
      subjectId: query.subjectId,
      termId: query.termId,
      teacherId: query.teacherId,
      status: query.status,
      type: query.type, // ✅ Ajout du filtre type
    }, user);
  }

  @Get(":id")
  @RequirePermissions("assessment:view")
  async findOne(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(id, this.getSchoolScope(user));
  }

  @Post()
  @RequirePermissions("assessment:create")
  @ApiOperation({ summary: "Creer une evaluation" })
  async create(
    @Body(new ZodValidationPipe(AssessmentCreateSchema)) rawDto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const dto = { ...rawDto, schoolId: user.schoolId };
    return this.service.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("assessment:update")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(AssessmentUpdateSchema)) dto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, this.getSchoolScope(user));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("assessment:delete")
  async remove(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.service.remove(id, this.getSchoolScope(user));
  }

  // ============================================================
  // WORKFLOW
  // ============================================================

  @Post(":id/open")
  @RequirePermissions("assessment:update")
  @ApiOperation({ summary: "Ouvrir la saisie des notes" })
  async open(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.open(id, this.getSchoolScope(user));
  }

  @Post(":id/submit")
  @RequirePermissions("assessment:update")
  @ApiOperation({ summary: "Soumettre l evaluation pour validation" })
  async submit(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.submit(id, this.getSchoolScope(user));
  }

  @Post(":id/validate")
  @RequirePermissions("assessment:validate")
  @ApiOperation({ summary: "Valider l evaluation" })
  async validate(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.validate(id, this.getSchoolScope(user));
  }

  @Post(":id/lock")
  @RequirePermissions("grade:lock")
  @ApiOperation({ summary: "Verrouiller l evaluation et ses notes" })
  async lock(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.lock(id, this.getSchoolScope(user));
  }

  @Post(":id/reopen")
  @RequirePermissions("assessment:update")
  @ApiOperation({ summary: "Reouvrir la saisie (Directeur)" })
  async reopen(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.reopen(id, this.getSchoolScope(user));
  }

  // ============================================================
  // EXPORTS
  // ============================================================

  @Get(":id/export/pdf")
  @RequirePermissions("assessment:export")
  @ApiOperation({ summary: "Exporter en PDF" })
  async exportPDF(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    const data = await this.service.getExportData(id, this.getSchoolScope(user));
    const buffer = await generateAssessmentPDF(data);
    const filename = `fiche-notes-${data.assessmentTitle.replace(/[^a-z0-9]/gi, "-")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get(":id/export/excel")
  @RequirePermissions("assessment:export")
  @ApiOperation({ summary: "Exporter en Excel" })
  async exportExcel(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    const data = await this.service.getExportData(id, this.getSchoolScope(user));
    const buffer = await generateAssessmentExcel(data);
    const filename = `fiche-notes-${data.assessmentTitle.replace(/[^a-z0-9]/gi, "-")}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get(":id/export/csv")
  @RequirePermissions("assessment:export")
  @ApiOperation({ summary: "Exporter en CSV" })
  async exportCSV(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    const data = await this.service.getExportData(id, this.getSchoolScope(user));
    const csv = generateAssessmentCSV(data);
    const filename = `fiche-notes-${data.assessmentTitle.replace(/[^a-z0-9]/gi, "-")}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csv);
  }
}