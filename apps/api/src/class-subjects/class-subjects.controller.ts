import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { ClassSubjectsService } from "./class-subjects.service";
import {
  ClassSubjectCreateSchema,
  ClassSubjectUpdateSchema,
  ClassSubjectBulkCreateSchema,
  ClassSubjectReorderSchema,
} from "./dto";
import { ZodValidationPipe } from "../common/pipes";
import { RequirePermissions, CurrentUser, CurrentUserPayload } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";

@ApiTags("ClassSubjects")
@ApiBearerAuth("access-token")
@Controller("class-subjects")
@UseGuards(SchoolScopeGuard)
export class ClassSubjectsController {
  constructor(private readonly service: ClassSubjectsService) {}

  @Get()
  @RequirePermissions("subject:view")
  @ApiOperation({ summary: "Liste des affectations matieres-classes" })
  @ApiQuery({ name: "classId", required: false })
  @ApiQuery({ name: "academicYearId", required: false })
  @ApiQuery({ name: "subjectId", required: false })
  @ApiQuery({ name: "isActive", required: false, type: Boolean })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query("classId") classId?: string,
    @Query("academicYearId") academicYearId?: string,
    @Query("subjectId") subjectId?: string,
    @Query("isActive") isActive?: string,
  ) {
    const filters: any = {};
    if (classId) filters.classId = classId;
    if (academicYearId) filters.academicYearId = academicYearId;
    if (subjectId) filters.subjectId = subjectId;
    if (isActive !== undefined) filters.isActive = isActive === "true";
    return this.service.findAll(user, filters);
  }

  @Get(":id")
  @RequirePermissions("subject:view")
  async findOne(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(id, user);
  }

  @Post()
  @RequirePermissions("subject:update")
  @ApiOperation({ summary: "Affecter une matiere a une classe" })
  async create(
    @Body(new ZodValidationPipe(ClassSubjectCreateSchema)) dto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Post("bulk")
  @RequirePermissions("subject:update")
  @ApiOperation({ summary: "Affecter plusieurs matieres a une classe en une operation" })
  async bulkCreate(
    @Body(new ZodValidationPipe(ClassSubjectBulkCreateSchema)) dto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.bulkCreate(dto, user);
  }

  @Patch("reorder")
  @RequirePermissions("subject:update")
  @ApiOperation({ summary: "Reordonner les matieres d'une classe (drag and drop)" })
  async reorder(
    @Body(new ZodValidationPipe(ClassSubjectReorderSchema)) dto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.reorder(dto, user);
  }

  @Patch(":id")
  @RequirePermissions("subject:update")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ClassSubjectUpdateSchema)) dto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("subject:update")
  @ApiOperation({ summary: "Desactiver une affectation (soft-delete)" })
  async remove(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.service.remove(id, user);
  }
}