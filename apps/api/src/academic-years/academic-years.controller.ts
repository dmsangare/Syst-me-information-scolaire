import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards, BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AcademicYearsService } from "./academic-years.service";
import { AcademicYearCreateSchema, AcademicYearUpdateSchema } from "./dto";
import { ZodValidationPipe } from "../common/pipes";
import { RequirePermissions, CurrentUser, CurrentUserPayload } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";
import { PaginationDto } from "../common/dto/pagination.dto";

@ApiTags("AcademicYears")
@ApiBearerAuth("access-token")
@Controller("academic-years")
@UseGuards(SchoolScopeGuard)
export class AcademicYearsController {
  constructor(private readonly service: AcademicYearsService) {}

  @Get("current")
  @ApiOperation({ summary: "Annee scolaire en cours (accessible a tous)" })
  async getCurrent(@CurrentUser() user: CurrentUserPayload) {
    if (!user.schoolId) {
      throw new BadRequestException("Utilisateur sans ecole");
    }
    return this.service.getCurrent(user.schoolId);
  }

  @Get()
  @RequirePermissions("academic_year:view")
  @ApiOperation({ summary: "Liste des annees scolaires" })
  async findAll(@CurrentUser() user: CurrentUserPayload, @Query() query: PaginationDto) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;
    return this.service.findAll(schoolId, query.page, query.limit);
  }

  @Get(":id")
  @RequirePermissions("academic_year:view")
  @ApiOperation({ summary: "Detail d une annee scolaire" })
  async findOne(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(id, user);
  }

  @Post()
  @RequirePermissions("academic_year:create")
  @ApiOperation({ summary: "Creer une annee scolaire" })
  async create(@Body(new ZodValidationPipe(AcademicYearCreateSchema)) dto: any) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("academic_year:update")
  @ApiOperation({ summary: "Modifier une annee scolaire" })
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(AcademicYearUpdateSchema)) dto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Post(":id/activate")
  @RequirePermissions("academic_year:update")
  @ApiOperation({ summary: "Activer une annee scolaire" })
  async activate(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.activate(id, user);
  }

  @Get(":id/closing-summary")
  @RequirePermissions("academic_year:view")
  @ApiOperation({ summary: "Resume de l'etat avant cloture" })
  async getClosingSummary(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.getClosingSummary(id, user);
  }

  @Post(":id/close")
  @RequirePermissions("academic_year:close")
  @ApiOperation({ summary: "Cloturer une annee scolaire" })
  async close(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.close(id, user);
  }

  @Post(":id/archive")
  @RequirePermissions("academic_year:archive")
  @ApiOperation({ summary: "Archiver une annee scolaire" })
  async archive(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.archive(id, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("academic_year:delete")
  @ApiOperation({ summary: "Supprimer une annee scolaire" })
  async remove(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.service.remove(id, user);
  }
}