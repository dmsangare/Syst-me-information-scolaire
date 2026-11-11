import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { FeeStructuresService } from "./fee-structures.service";
import { FeeStructureCreateSchema } from "./dto";
import { ZodValidationPipe } from "../common/pipes";
import { RequirePermissions, CurrentUser, CurrentUserPayload } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";

@ApiTags("FeeStructures")
@ApiBearerAuth("access-token")
@Controller("fee-structures")
@UseGuards(SchoolScopeGuard)
export class FeeStructuresController {
  constructor(private readonly service: FeeStructuresService) {}

  @Get()
  @RequirePermissions("fee:view")
  @ApiOperation({ summary: "Liste des grilles tarifaires" })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query("academicYearId") academicYearId?: string,
    @Query("levelId") levelId?: string,
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;
    return this.service.findAll(schoolId, academicYearId, levelId);
  }

  @Get("level/:levelId")
  @RequirePermissions("fee:view")
  @ApiOperation({ summary: "Grille tarifaire d un niveau" })
  async getForLevel(
    @CurrentUser() user: CurrentUserPayload,
    @Param("levelId") levelId: string,
    @Query("academicYearId") academicYearId: string,
  ) {
    return this.service.getForLevel(user.schoolId!, academicYearId, levelId);
  }

  @Get("coverage/:yearId")
  @RequirePermissions("fee:view")
  @ApiOperation({ summary: "Rapport de couverture : niveaux sans grille" })
  async getCoverage(
    @CurrentUser() user: CurrentUserPayload,
    @Param("yearId") yearId: string,
  ) {
    return this.service.getCoverage(user.schoolId!, yearId);
  }

  @Get(":id")
  @RequirePermissions("fee:view")
  async findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions("fee:create")
  async create(@Body(new ZodValidationPipe(FeeStructureCreateSchema)) dto: any) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("fee:update")
  async update(@Param("id") id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("fee:delete")
  async remove(@Param("id") id: string) {
    await this.service.remove(id);
  }
}
