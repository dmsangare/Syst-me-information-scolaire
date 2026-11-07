import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { TopStudentsQuerySchema } from "./dto";
import { ZodValidationPipe } from "../common/pipes";
import {
  RequirePermissions,
  CurrentUser,
  CurrentUserPayload,
} from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";

@ApiTags("Dashboard")
@ApiBearerAuth("access-token")
@Controller("dashboard")
@UseGuards(SchoolScopeGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get("top-students")
  @ApiOperation({ summary: "Top 3 eleves par cycle (tableau d'honneur)" })
  async topStudents(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(TopStudentsQuerySchema)) query: any,
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN")
      ? await this.getSuperAdminSchoolId(user)
      : user.schoolId;
    if (!schoolId) throw new BadRequestException("Ecole introuvable");
    return this.service.getTopStudents(schoolId, query.termId);
  }

  @Post("top-students/recompute")
  @RequirePermissions("report_card:create")
  @ApiOperation({ summary: "Recalculer le Top 3 (admin/directeur)" })
  async recompute(
    @CurrentUser() user: CurrentUserPayload,
    @Query("termId") termId?: string,
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN")
      ? await this.getSuperAdminSchoolId(user)
      : user.schoolId;
    if (!schoolId) throw new BadRequestException("Ecole introuvable");
    return this.service.recomputeTopStudents(schoolId, termId);
  }

  @Get("honor-roll")
  @ApiOperation({ summary: "Tableau d'honneur : Top N classes par cycle" })
  async honorRoll(
    @CurrentUser() user: CurrentUserPayload,
    @Query("termId") termId?: string,
    @Query("cycle") cycle?: string,
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN")
      ? await this.getSuperAdminSchoolId(user)
      : user.schoolId;
    if (!schoolId) throw new BadRequestException("Ecole introuvable");
    if (cycle && !["PREMIER_CYCLE", "DEUXIEME_CYCLE", "LYCEE"].includes(cycle)) {
      throw new BadRequestException("Cycle invalide");
    }
    return this.service.getHonorRoll(schoolId, termId, cycle);
  }

  @Get("teacher")
  @ApiOperation({ summary: "Dashboard enseignant" })
  async teacherDashboard(@CurrentUser() user: CurrentUserPayload) {
    if (!user.schoolId) throw new BadRequestException("Utilisateur sans ecole");
    return this.service.getTeacherDashboard(user.id, user.schoolId);
  }

  @Get("supervisor")
  @ApiOperation({ summary: "Dashboard surveillant" })
  async supervisorDashboard(@CurrentUser() user: CurrentUserPayload) {
    if (!user.schoolId) throw new BadRequestException("Utilisateur sans ecole");
    return this.service.getSupervisorDashboard(user.schoolId);
  }

  @Get("secretary")
  @ApiOperation({ summary: "Dashboard secretariat" })
  async secretaryDashboard(@CurrentUser() user: CurrentUserPayload) {
    if (!user.schoolId) throw new BadRequestException("Utilisateur sans ecole");
    return this.service.getSecretaryDashboard(user.schoolId);
  }

  // ============================================================
  // LOT 2B — Endpoints pour la refonte du dashboard
  // ============================================================

  @Get("enrollment-by-class")
  @RequirePermissions("dashboard:view")
  @ApiOperation({ summary: "Effectifs par classe avec répartition garçons/filles" })
  async enrollmentByClass(@CurrentUser() user: CurrentUserPayload) {
    const schoolId = user.roles.includes("SUPER_ADMIN")
      ? await this.getSuperAdminSchoolId(user)
      : user.schoolId;
    if (!schoolId) throw new BadRequestException("Ecole introuvable");
    return this.service.getEnrollmentByClass(schoolId);
  }

  @Get("classes-distribution")
  @RequirePermissions("dashboard:view")
  @ApiOperation({ summary: "Répartition des classes par niveau (donut)" })
  async classesDistribution(@CurrentUser() user: CurrentUserPayload) {
    const schoolId = user.roles.includes("SUPER_ADMIN")
      ? await this.getSuperAdminSchoolId(user)
      : user.schoolId;
    if (!schoolId) throw new BadRequestException("Ecole introuvable");
    return this.service.getClassesDistribution(schoolId);
  }

  @Get("recent-report-cards")
  @RequirePermissions("dashboard:view")
  @ApiOperation({ summary: "5 derniers bulletins" })
  async recentReportCards(
    @CurrentUser() user: CurrentUserPayload,
    @Query("limit") limit?: string,
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN")
      ? await this.getSuperAdminSchoolId(user)
      : user.schoolId;
    if (!schoolId) throw new BadRequestException("Ecole introuvable");
    return this.service.getRecentReportCards(
      schoolId,
      limit ? Number(limit) : 5,
    );
  }

  @Get("recent-activities")
  @RequirePermissions("dashboard:view")
  @ApiOperation({ summary: "10 dernières activités (AuditLog)" })
  async recentActivities(
    @CurrentUser() user: CurrentUserPayload,
    @Query("limit") limit?: string,
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN")
      ? await this.getSuperAdminSchoolId(user)
      : user.schoolId;
    if (!schoolId) throw new BadRequestException("Ecole introuvable");
    return this.service.getRecentActivities(
      schoolId,
      limit ? Number(limit) : 10,
    );
  }

  /**
   * Pour un SUPER_ADMIN, on prend la premiere ecole active
   * (utile en mode mono-etablissement).
   */
  private async getSuperAdminSchoolId(
    user: CurrentUserPayload,
  ): Promise<string | null> {
    if (user.schoolId) return user.schoolId;
    return null;
  }
}