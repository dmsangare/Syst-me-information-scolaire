import {
  Controller, Get, Post, Body, Param, Query, UseGuards, BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AttendanceStudentService } from "./attendance-student.service";
import { DailyAttendanceService } from "./daily-attendance.service";
import { RequirePermissions, CurrentUser, CurrentUserPayload } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";

@ApiTags("AttendanceStudent")
@ApiBearerAuth("access-token")
@Controller("attendance")
@UseGuards(SchoolScopeGuard)
export class AttendanceStudentController {
  constructor(
    private readonly studentService: AttendanceStudentService,
    private readonly dailyService: DailyAttendanceService,
  ) {}

  @Post("daily/records/:recordId/justify")
  @RequirePermissions("attendance:update")
  @ApiOperation({ summary: "Justifier une absence" })
  async justify(
    @CurrentUser() user: CurrentUserPayload,
    @Param("recordId") recordId: string,
    @Body() dto: { decision: "ACCEPTED" | "REJECTED"; reason: string; observation?: string },
  ) {
    if (!user.schoolId) throw new BadRequestException("Ecole introuvable");
    if (!dto.decision || !dto.reason) throw new BadRequestException("decision et reason obligatoires");
    return this.dailyService.justifyRecord(user.schoolId, user.id, recordId, dto);
  }

  @Get("student/:studentId/summary")
  @RequirePermissions("attendance:view")
  @ApiOperation({ summary: "Bilan annuel d'assiduité" })
  async summary(
    @CurrentUser() user: CurrentUserPayload,
    @Param("studentId") studentId: string,
    @Query("academicYearId") academicYearId?: string,
  ) {
    if (!user.schoolId) throw new BadRequestException("Ecole introuvable");
    return this.studentService.getStudentSummary(user.schoolId, studentId, academicYearId);
  }

  @Get("student/:studentId/history")
  @RequirePermissions("attendance:view")
  @ApiOperation({ summary: "Historique détaillé des absences" })
  async history(
    @CurrentUser() user: CurrentUserPayload,
    @Param("studentId") studentId: string,
    @Query("academicYearId") academicYearId?: string,
  ) {
    if (!user.schoolId) throw new BadRequestException("Ecole introuvable");
    return this.studentService.getStudentHistory(user.schoolId, studentId, academicYearId);
  }
}
