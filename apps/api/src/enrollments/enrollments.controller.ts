import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { EnrollmentsService } from "./enrollments.service";
import { EnrollmentCreateSchema, EnrollmentUpdateSchema } from "./dto";
import { ZodValidationPipe } from "../common/pipes";
import { RequirePermissions, CurrentUser, CurrentUserPayload } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";
import { PaginationDto } from "../common/dto/pagination.dto";

@ApiTags("Enrollments")
@ApiBearerAuth("access-token")
@Controller("enrollments")
@UseGuards(SchoolScopeGuard)
export class EnrollmentsController {
  constructor(private readonly service: EnrollmentsService) {}

    @Get()
  @RequirePermissions("enrollment:view")
  @ApiOperation({ summary: "Liste des inscriptions" })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("q") q?: string,
    @Query("academicYearId") academicYearId?: string,
    @Query("classId") classId?: string,
    @Query("status") status?: string,
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;
    const pageNum = Number(page) || 1;
    const limitNum = Math.min(Number(limit) || 20, 200);
    return this.service.findAll(schoolId, pageNum, limitNum, q, academicYearId, classId, status);
  }

  @Get(":id")
  @RequirePermissions("enrollment:view")
  async findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions("enrollment:create")
  @ApiOperation({ summary: "Creer une inscription" })
  async create(@Body(new ZodValidationPipe(EnrollmentCreateSchema)) dto: any) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("enrollment:update")
  async update(@Param("id") id: string, @Body(new ZodValidationPipe(EnrollmentUpdateSchema)) dto: any) {
    return this.service.update(id, dto);
  }

  @Post(":id/validate")
  @RequirePermissions("enrollment:validate")
  @ApiOperation({ summary: "Valider une inscription" })
  async validate(@Param("id") id: string) {
    return this.service.validate(id);
  }

  @Post(":id/cancel")
  @RequirePermissions("enrollment:update")
  @ApiOperation({ summary: "Annuler une inscription" })
  async cancel(@Param("id") id: string) {
    return this.service.cancel(id);
  }

  @Post(":id/complete")
  @RequirePermissions("enrollment:update")
  @ApiOperation({ summary: "Marquer l inscription comme terminee" })
  async complete(@Param("id") id: string) {
    return this.service.complete(id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("enrollment:delete")
  async remove(@Param("id") id: string) {
    await this.service.remove(id);
  }
}
