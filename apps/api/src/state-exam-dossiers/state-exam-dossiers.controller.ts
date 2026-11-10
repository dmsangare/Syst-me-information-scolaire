import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators';
import { StateExamDossiersService } from './state-exam-dossiers.service';
import {
  CreateSessionSchema,
  GenerateDossiersSchema,
  PatchDossierSchema,
  PatchPieceSchema,
  TransmitSchema,
  ReceiveSchema,
} from './dto';

@Controller('state-exam-dossiers')
@UseGuards(JwtAuthGuard)
export class StateExamDossiersController {
  constructor(private readonly service: StateExamDossiersService) {}

  private sid(req: any): string {
    return req.user.schoolId;
  }
  private uid(req: any): string {
    return req.user.id ?? req.user.userId;
  }

  // ============================================================
  // SESSIONS
  // ============================================================

  @Get('sessions')
  @RequirePermissions('exam:view')
  async listSessions(
    @Req() req: any,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.service.listSessions(this.sid(req), academicYearId);
  }

  @Get('sessions/:id')
  @RequirePermissions('exam:view')
  async getSession(@Req() req: any, @Param('id') id: string) {
    return this.service.getSession(this.sid(req), id);
  }

  @Post('sessions')
  @RequirePermissions('exam:create')
  async createSession(@Req() req: any, @Body() body: any) {
    const parsed = CreateSessionSchema.parse(body);
    return this.service.createSession(this.sid(req), this.uid(req), parsed);
  }

  @Post('sessions/:id/generate-dossiers')
  @RequirePermissions('exam:create')
  async generateDossiers(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const parsed = GenerateDossiersSchema.parse(body ?? {});
    return this.service.generateDossiers(this.sid(req), this.uid(req), id, parsed);
  }

  // ============================================================
  // DOSSIERS
  // ============================================================

  @Get('dossiers/:id')
  @RequirePermissions('exam:view')
  async getDossier(@Req() req: any, @Param('id') id: string) {
    return this.service.getDossier(this.sid(req), id);
  }

  @Patch('dossiers/:id')
  @RequirePermissions('exam:update')
  async patchDossier(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const parsed = PatchDossierSchema.parse(body ?? {});
    return this.service.patchDossier(this.sid(req), id, parsed);
  }

  @Post('dossiers/:id/status')
  @RequirePermissions('exam:update')
  async changeStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.service.changeStatus(this.sid(req), id, body.status);
  }

  // ============================================================
  // PIECES
  // ============================================================

  @Post('dossiers/:id/students/:studentId/pieces/:pieceType')
  @RequirePermissions('exam:update')
  async upsertPiece(
    @Req() req: any,
    @Param('id') dossierId: string,
    @Param('studentId') studentId: string,
    @Param('pieceType') pieceType: string,
    @Body() body: any,
  ) {
    const parsed = PatchPieceSchema.parse(body ?? {});
    return this.service.upsertPiece(
      this.sid(req),
      dossierId,
      studentId,
      pieceType,
      parsed,
      this.uid(req),
    );
  }

  // ============================================================
  // TRANSMISSION
  // ============================================================

  @Post('dossiers/:id/transmit')
  @RequirePermissions('exam:update')
  async transmit(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const parsed = TransmitSchema.parse(body ?? {});
    return this.service.transmit(this.sid(req), this.uid(req), id, parsed);
  }

  @Post('dossiers/:id/receive')
  @RequirePermissions('exam:update')
  async receive(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const parsed = ReceiveSchema.parse(body ?? {});
    return this.service.receive(this.sid(req), this.uid(req), id, parsed);
  }
}