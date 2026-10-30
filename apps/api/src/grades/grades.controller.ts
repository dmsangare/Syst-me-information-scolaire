import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  HttpCode, HttpStatus, UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { GradesService } from "./grades.service";
import { GradesBulkSchema, GradeUpdateSchema } from "./dto";
import { ZodValidationPipe } from "../common/pipes";
import { RequirePermissions, CurrentUser } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";

@ApiTags("Grades")
@ApiBearerAuth("access-token")
@Controller("grades")
@UseGuards(SchoolScopeGuard)
export class GradesController {
  constructor(private readonly service: GradesService) {}

  @Get("assessment/:assessmentId")
  @RequirePermissions("grade:view")
  @ApiOperation({ summary: "Liste des notes d une evaluation avec les eleves" })
  async findByAssessment(@Param("assessmentId") assessmentId: string) {
    return this.service.findByAssessment(assessmentId);
  }

  @Get("assessment/:assessmentId/stats")
  @RequirePermissions("grade:view")
  @ApiOperation({ summary: "Statistiques d une evaluation" })
  async getStats(@Param("assessmentId") assessmentId: string) {
    return this.service.getAssessmentStats(assessmentId);
  }

  @Get("student/:studentId/subject/:subjectId/term/:termId/average")
  @RequirePermissions("grade:view")
  @ApiOperation({ summary: "Moyenne d un eleve dans une matiere pour un trimestre" })
  async getAverage(
    @Param("studentId") studentId: string,
    @Param("subjectId") subjectId: string,
    @Param("termId") termId: string,
  ) {
    return this.service.getStudentSubjectAverage(studentId, subjectId, termId);
  }

  @Post("bulk")
  @RequirePermissions("grade:create")
  @ApiOperation({ summary: "Saisie en masse des notes" })
  async bulkEntry(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(GradesBulkSchema)) dto: any,
  ) {
    return this.service.bulkEntry(dto, user);
  }

  @Patch(":id")
  @RequirePermissions("grade:update")
  async update(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(GradeUpdateSchema)) dto: any,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("grade:delete")
  async remove(@Param("id") id: string, @CurrentUser() user: any) {
    await this.service.remove(id, user);
  }
}