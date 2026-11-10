import {
  Res,
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Response } from "express";
import { TransfersService } from "./transfers.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateOutboundTransferSchema,
  CreateInboundTransferSchema,
  RejectTransferSchema,
} from "./dto";
import { ZodValidationPipe } from "../common/pipes";
import {
  RequirePermissions,
  CurrentUser,
  CurrentUserPayload,
  Public,
} from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";
import { PaginationDto } from "../common/dto/pagination.dto";

@ApiTags("Transfers")
@Controller("transfers")
export class TransfersController {
  constructor(
    private readonly service: TransfersService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // VERIFICATION PUBLIQUE (pas de login)
  // ============================================================

  @Public()
  @Get("verify/:code")
  @ApiOperation({ summary: "Verifier un transfert par code (public)" })
  async verifyByCode(@Param("code") code: string) {
    return this.service.findByVerificationCode(code);
  }

  // ============================================================
  // LISTE ET DETAIL
  // ============================================================

  @ApiBearerAuth("access-token")
  @Get()
  @UseGuards(SchoolScopeGuard)
  @RequirePermissions("student:view")
  @ApiOperation({ summary: "Liste des transferts" })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: PaginationDto,
    @Query("type") type?: "IN" | "OUT",
    @Query("status") status?: "PENDING" | "VERIFIED" | "REJECTED" | "ARCHIVED",
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;
    return this.service.findAll(schoolId, query.page, query.limit, type, status, query.q);
  }

  @ApiBearerAuth("access-token")
  @Get("stats")
  @UseGuards(SchoolScopeGuard)
  @RequirePermissions("student:view")
  @ApiOperation({ summary: "Statistiques des transferts" })
  async stats(@CurrentUser() user: CurrentUserPayload) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;
    return this.service.getStats(schoolId);
  }

  @ApiBearerAuth("access-token")
  @Get(":id")
  @UseGuards(SchoolScopeGuard)
  @RequirePermissions("student:view")
  @ApiOperation({ summary: "Detail d un transfert" })
  async findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  // ============================================================
  // CREATION
  // ============================================================

  @ApiBearerAuth("access-token")
  @Post("out")
  @UseGuards(SchoolScopeGuard)
  @RequirePermissions("student:update")
  @ApiOperation({ summary: "Creer un transfert sortant" })
  async createOutbound(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(CreateOutboundTransferSchema)) dto: any,
  ) {
    return this.service.createOutbound(dto, userId);
  }

  @ApiBearerAuth("access-token")
  @Post("in")
  @UseGuards(SchoolScopeGuard)
  @RequirePermissions("student:create")
  @ApiOperation({ summary: "Creer un transfert entrant" })
  async createInbound(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(CreateInboundTransferSchema)) dto: any,
  ) {
    return this.service.createInbound(dto, userId);
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  @ApiBearerAuth("access-token")
  @Post(":id/verify")
  @UseGuards(SchoolScopeGuard)
  @RequirePermissions("student:update")
  @ApiOperation({ summary: "Verifier un transfert" })
  async verify(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.verify(id, userId);
  }

  @ApiBearerAuth("access-token")
  @Post(":id/reject")
  @UseGuards(SchoolScopeGuard)
  @RequirePermissions("student:update")
  @ApiOperation({ summary: "Rejeter un transfert" })
  async reject(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(RejectTransferSchema)) dto: any,
  ) {
    return this.service.reject(id, dto.reason);
  }

  @ApiBearerAuth("access-token")
  @Post(":id/archive")
  @UseGuards(SchoolScopeGuard)
  @RequirePermissions("student:update")
  @ApiOperation({ summary: "Archiver un transfert" })
  async archive(@Param("id") id: string) {
    return this.service.archive(id);
  }

  // ============================================================
  // QR CODE
  // ============================================================

  @ApiBearerAuth("access-token")
  @Get(":id/qrcode")
  @UseGuards(SchoolScopeGuard)
  @RequirePermissions("student:view")
  @ApiOperation({ summary: "QR code de verification du transfert" })
  async getQRCode(@Param("id") id: string) {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost";
    const dataUrl = await this.service.generateQRCode(id, baseUrl);
    return { qrCode: dataUrl };
  }

  // ============================================================
  // SUPPRESSION
  // ============================================================


  @ApiBearerAuth("access-token")
  @Get(":id/certificate")
  @UseGuards(SchoolScopeGuard)
  @RequirePermissions("student:view")
  @ApiOperation({ summary: "Certificat de transfert PDF" })
  async getCertificate(
    @Param("id") id: string,
    @Res() res: Response,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;
    const baseUrl = process.env.FRONTEND_URL || "http://localhost";

    // Recuperer les infos de l'ecole
    let schoolName = "Etablissement";
    let schoolAddress: string | null = null;
    let schoolPhone: string | null = null;
    let schoolDirector: string | null = null;
    let schoolMotto: string | null = null;

    if (schoolId) {
      const school = await this.prisma.school.findUnique({
        where: { id: schoolId },
      });
      if (school) {
        schoolName = school.name;
        schoolAddress = school.address;
        schoolPhone = school.phone;
        schoolDirector = school.directorName;
        schoolMotto = school.motto;
      }
    }

    const buffer = await this.service.generateCertificate(
      id,
      baseUrl,
      schoolName,
      schoolAddress,
      schoolPhone,
      schoolDirector,
      schoolMotto,
    );

    const filename = `certificat-transfert-${id.slice(0, 8)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @ApiBearerAuth("access-token")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SchoolScopeGuard)
  @RequirePermissions("student:delete")
  @ApiOperation({ summary: "Supprimer un transfert (PENDING seulement)" })
  async remove(@Param("id") id: string) {
    await this.service.remove(id);
  }
}
