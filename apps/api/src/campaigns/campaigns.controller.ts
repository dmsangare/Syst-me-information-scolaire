import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { CampaignsService } from "./campaigns.service";
import {
  CampaignCreateSchema,
  CampaignUpdateSchema,
  CampaignListQuerySchema,
  AssessmentCreateSchema,
  GradesSaveSchema,
  ValidateTeacherSchema,
} from "./dto";
import { ZodValidationPipe } from "../common/pipes";
import { RequirePermissions, CurrentUser, CurrentUserPayload } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";

@ApiTags("Campaigns")
@ApiBearerAuth("access-token")
@Controller("campaigns")
@UseGuards(SchoolScopeGuard)
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  @Get()
  @RequirePermissions("assessment:view")
  @ApiOperation({ summary: "Lister les campagnes (filtres: année, classe, term, statut)" })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(CampaignListQuerySchema)) query: any,
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;
    return this.service.findAll(schoolId, query);
  }

  @Get(":id")
  @RequirePermissions("assessment:view")
  @ApiOperation({ summary: "Détail d'une campagne" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;
    return this.service.findOne(id, schoolId);
  }

  @Post()
  @RequirePermissions("assessment:create")
  @ApiOperation({ summary: "Créer une campagne pour une ou plusieurs classes" })
  async create(
    @Body(new ZodValidationPipe(CampaignCreateSchema)) dto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Patch(":id")
  @RequirePermissions("assessment:update")
  @ApiOperation({ summary: "Modifier une campagne" })
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(CampaignUpdateSchema)) dto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Post(":id/activate")
  @RequirePermissions("assessment:update")
  @ApiOperation({ summary: "Activer une campagne (BROUILLON -> ACTIVE)" })
  async activate(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.activate(id, user);
  }

  @Post(":id/validate")
  @RequirePermissions("assessment:validate")
  @ApiOperation({ summary: "Valider une campagne (ACTIVE -> VALIDE_DIRECTEUR)" })
  async validate(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.validate(id, user);
  }

  @Get(":id/my-subjects")
  @RequirePermissions("assessment:view")
  @ApiOperation({ summary: "Mes matieres a saisir dans cette campagne (enseignant)" })
  async getMySubjects(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.getMySubjects(id, user);
  }

  @Post(":id/assessments")
  @RequirePermissions("assessment:create")
  @ApiOperation({ summary: "Creer une evaluation dans la campagne (enseignant/directeur)" })
  async createAssessment(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(AssessmentCreateSchema)) dto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.createAssessment(id, dto, user);
  }

  @Patch(":id/assessments/:assessmentId/grades")
  @RequirePermissions("grade:create")
  @ApiOperation({ summary: "Saisir les notes d'une evaluation (bulk)" })
  async saveGrades(
    @Param("id") id: string,
    @Param("assessmentId") assessmentId: string,
    @Body(new ZodValidationPipe(GradesSaveSchema)) dto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.saveGrades(id, assessmentId, dto, user);
  }

  @Post(":id/validate-teacher")
  @RequirePermissions("grade:validate")
  @ApiOperation({ summary: "Valider mes notes pour une matiere (enseignant)" })
  async validateTeacher(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ValidateTeacherSchema)) dto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.validateTeacher(id, dto, user);
  }

  @Get(":id/results")
  @RequirePermissions("assessment:view")
  @ApiOperation({ summary: "Resultats de la campagne (moyennes, rangs)" })
  async getResults(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.getResults(id, user);
  }
}