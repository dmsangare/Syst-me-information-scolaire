import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AnnualDecisionsService } from "./annual-decisions.service";
import { RequirePermissions, CurrentUser, CurrentUserPayload } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";
import { ZodValidationPipe } from "../common/pipes";
import {
  AnnualDecisionProposeSchema,
  AnnualDecisionValidateSchema,
  AnnualDecisionReopenSchema,
  AnnualDecisionListQuerySchema,
} from "./dto";

@ApiTags("AnnualDecisions")
@ApiBearerAuth("access-token")
@Controller("annual-decisions")
@UseGuards(SchoolScopeGuard)
export class AnnualDecisionsController {
  constructor(private readonly service: AnnualDecisionsService) {}

  @Get("lists")
  @RequirePermissions("report_card:view")
  @ApiOperation({ summary: "Liste des décisions annuelles par classe" })
  list(
    @Query(new ZodValidationPipe(AnnualDecisionListQuerySchema)) q: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.list(q, user);
  }

  // ✅ NOUVELLE ROUTE : Suggestion automatique
  @Get("suggest/:studentId/:academicYearId")
  @RequirePermissions("report_card:view")
  @ApiOperation({ summary: "Suggérer la décision annuelle basée sur la moyenne annuelle" })
  suggest(
    @Param("studentId") studentId: string,
    @Param("academicYearId") academicYearId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.suggestDecision(studentId, academicYearId, user);
  }

  @Post("propose")
  @RequirePermissions("report_card:update")
  @ApiOperation({ summary: "Proposer une décision annuelle" })
  propose(
    @Body(new ZodValidationPipe(AnnualDecisionProposeSchema)) dto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.propose(dto, user);
  }

  @Patch(":id/validate")
  @RequirePermissions("report_card:update")
  @ApiOperation({ summary: "Valider une décision annuelle" })
  validate(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(AnnualDecisionValidateSchema)) dto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.validate(id, dto, user);
  }

  @Post(":id/reopen")
  @RequirePermissions("report_card:update")
  @ApiOperation({ summary: "Rouvrir une décision annuelle" })
  reopen(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(AnnualDecisionReopenSchema)) dto: { motive: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.reopen(id, dto.motive, user);
  }
}