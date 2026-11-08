import {
  Controller, Get, Patch, Post, Body, Param, Query, UseGuards, BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AttendanceAlertsService } from "./attendance-alerts.service";
import { RequirePermissions, CurrentUser, CurrentUserPayload } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";

@ApiTags("AttendanceAlerts")
@ApiBearerAuth("access-token")
@Controller("attendance/alerts")
@UseGuards(SchoolScopeGuard)
export class AttendanceAlertsController {
  constructor(private readonly service: AttendanceAlertsService) {}

  @Get()
  @RequirePermissions("attendance:view")
  @ApiOperation({ summary: "Liste des alertes d'assiduité" })
  async getAlerts(
    @CurrentUser() user: CurrentUserPayload,
    @Query("status") status?: string,
  ) {
    if (!user.schoolId) throw new BadRequestException("Ecole introuvable");
    return this.service.getAlerts(user.schoolId, status);
  }

  @Patch(":id")
  @RequirePermissions("attendance:update")
  @ApiOperation({ summary: "Changer le statut d'une alerte" })
  async updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: { status: string; notes?: string },
  ) {
    if (!user.schoolId) throw new BadRequestException("Ecole introuvable");
    return this.service.updateAlertStatus(user.schoolId, user.id, id, dto);
  }

  @Post("detect")
  @RequirePermissions("attendance:update")
  @ApiOperation({ summary: "Détecter manuellement les absences consécutives" })
  async detect(@CurrentUser() user: CurrentUserPayload) {
    if (!user.schoolId) throw new BadRequestException("Ecole introuvable");
    const today = new Date().toISOString().split("T")[0];
    return this.service.detectConsecutiveAbsences(user.schoolId, today);
  }
}