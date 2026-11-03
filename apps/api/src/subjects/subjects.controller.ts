import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { SubjectsService } from "./subjects.service";
import { SubjectCreateSchema, SubjectUpdateSchema } from "./dto";
import { ZodValidationPipe } from "../common/pipes";
import { RequirePermissions, CurrentUser, CurrentUserPayload } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";

@ApiTags("Subjects")
@ApiBearerAuth("access-token")
@Controller("subjects")
@UseGuards(SchoolScopeGuard)
export class SubjectsController {
  constructor(private readonly service: SubjectsService) {}

  @Get()
  @RequirePermissions("subject:view")
  @ApiOperation({ summary: "Liste des matieres" })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query("q") q?: string,
    @Query("type") type?: string,
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;
    return this.service.findAll(schoolId, q, type);
  }

  @Get(":id")
  @RequirePermissions("subject:view")
  async findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Get(":id/coefficients")
  @RequirePermissions("coefficient:view")
  @ApiOperation({ summary: "Coefficients de la matiere par niveau" })
  async getCoefficients(@Param("id") id: string) {
    return this.service.getCoefficients(id);
  }

  @Get(":id/coefficients/audits")
  @RequirePermissions("coefficient:view")
  @ApiOperation({ summary: "Historique des modifications de coefficients" })
  async getCoefficientAudits(
    @Param("id") subjectId: string,
    @Query("levelId") levelId?: string,
    @Query("academicYearId") academicYearId?: string,
  ) {
    return this.service.getCoefficientAudits(subjectId, levelId, academicYearId);
  }

  @Post()
  @RequirePermissions("subject:create")
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(SubjectCreateSchema)) dto: any,
  ) {
    return this.service.create({ ...dto, schoolId: user.schoolId });
  }

  @Patch(":id")
  @RequirePermissions("subject:update")
  async update(@Param("id") id: string, @Body(new ZodValidationPipe(SubjectUpdateSchema)) dto: any) {
    return this.service.update(id, dto);
  }

  @Post(":id/coefficients")
  @RequirePermissions("coefficient:edit")
  @ApiOperation({ summary: "Definir un coefficient pour un niveau et une annee scolaire" })
  async setCoefficient(
    @Param("id") subjectId: string,
    @Body() body: {
      levelId: string;
      academicYearId: string;
      coefficient: number;
      weeklyHours?: number;
    },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.setCoefficient(
      subjectId,
      body.levelId,
      body.academicYearId,
      body.coefficient,
      body.weeklyHours,
      user.id,
    );
  }

  @Delete(":id/coefficients/:levelId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("coefficient:manage")
  async removeCoefficient(
    @Param("id") subjectId: string,
    @Param("levelId") levelId: string,
    @Query("academicYearId") academicYearId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.service.removeCoefficient(subjectId, levelId, academicYearId, user.id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("subject:delete")
  async remove(@Param("id") id: string) {
    await this.service.remove(id);
  }

  @Patch(":id/reactivate")
  @RequirePermissions("subject:update")
  @ApiOperation({ summary: "Reactiver une matiere desactivee" })
  async reactivate(@Param("id") id: string) {
    return this.service.reactivate(id);
  }
}