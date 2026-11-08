import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { DailyAttendanceService } from "./daily-attendance.service";
import { RequirePermissions, CurrentUser, CurrentUserPayload } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";

@ApiTags("DailyAttendance")
@ApiBearerAuth("access-token")
@Controller("attendance/daily")
@UseGuards(SchoolScopeGuard)
export class DailyAttendanceController {
  constructor(private readonly service: DailyAttendanceService) {}

  @Get("classes")
  @RequirePermissions("attendance:view")
  @ApiOperation({ summary: "État des appels par classe pour une date" })
  async getClassesStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Query("date") date?: string,
  ) {
    const d = date ?? new Date().toISOString().split("T")[0];
    if (!user.schoolId) throw new BadRequestException("Ecole introuvable");
    return this.service.getClassesStatus(user.schoolId, d, user.id);
  }

  @Get("class/:classId")
  @RequirePermissions("attendance:view")
  @ApiOperation({ summary: "Récupère l'appel d'une classe à une date" })
  async getByClass(
    @CurrentUser() user: CurrentUserPayload,
    @Param("classId") classId: string,
    @Query("date") date?: string,
  ) {
    const d = date ?? new Date().toISOString().split("T")[0];
    if (!user.schoolId) throw new BadRequestException("Ecole introuvable");
    return this.service.getByClassAndDate(user.schoolId, classId, d);
  }

  @Post()
  @RequirePermissions("attendance:create")
  @ApiOperation({ summary: "Créer un appel quotidien" })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: any,
  ) {
    if (!user.schoolId) throw new BadRequestException("Ecole introuvable");
    if (!dto.classId || !dto.date || !Array.isArray(dto.records)) {
      throw new BadRequestException("classId, date et records obligatoires");
    }
    return this.service.create(user.schoolId, user.id, dto);
  }

  @Patch("records/:recordId")
  @RequirePermissions("attendance:update")
  @ApiOperation({ summary: "Modifier un statut (avec historique)" })
  async updateRecord(
    @CurrentUser() user: CurrentUserPayload,
    @Param("recordId") recordId: string,
    @Body() dto: any,
  ) {
    if (!user.schoolId) throw new BadRequestException("Ecole introuvable");
    return this.service.updateRecord(user.schoolId, user.id, recordId, dto);
  }

  @Get("stats")
  @RequirePermissions("attendance:view")
  @ApiOperation({ summary: "Statistiques du jour" })
  async getDayStats(
    @CurrentUser() user: CurrentUserPayload,
    @Query("date") date?: string,
  ) {
    const d = date ?? new Date().toISOString().split("T")[0];
    if (!user.schoolId) throw new BadRequestException("Ecole introuvable");
    return this.service.getDayStats(user.schoolId, d);
  }
}