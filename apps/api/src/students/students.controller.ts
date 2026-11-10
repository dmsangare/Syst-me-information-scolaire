import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Res,
  HttpCode, HttpStatus, UseGuards, UseInterceptors, UploadedFile,
  BadRequestException, NotFoundException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Response } from "express";
import { StudentsService } from "./students.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  StudentCreateSchema,
  StudentUpdateSchema,
  StudentListQueryDto,
} from "./dto";
import { ZodValidationPipe } from "../common/pipes";
import { RequirePermissions, CurrentUser, CurrentUserPayload, AllowNoPermissions } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";

@ApiTags("Students")
@ApiBearerAuth("access-token")
@Controller("students")
@UseGuards(SchoolScopeGuard)
export class StudentsController {
  constructor(
    private readonly service: StudentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("available")
  @RequirePermissions("student:view")
  @ApiOperation({ summary: "Eleves sans compte utilisateur (pour lier)" })
  async findAvailable(@CurrentUser() user: CurrentUserPayload) {
    const schoolId = user.roles?.includes("SUPER_ADMIN") ? undefined : user.schoolId;
    return this.prisma.student.findMany({
      where: {
        userId: null,
        ...(schoolId ? { schoolId } : {}),
        deletedAt: null,
      },
      select: {
        id: true,
        matricule: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { lastName: "asc" },
      take: 500,
    });
  }

  @Get("me")
  @AllowNoPermissions()
  @ApiOperation({ summary: "Profil de l'élève connecté (via son userId)" })
  async me(@CurrentUser() user: CurrentUserPayload) {
    const student = await this.service.findByUserId(
      user.schoolId!,
      user.id,
    );
    if (!student) {
      throw new NotFoundException("Profil élève introuvable");
    }
    return student;
  }

  @Get()
  @RequirePermissions("student:view")
  @ApiOperation({ summary: "Liste des eleves avec filtres avances" })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: StudentListQueryDto,
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;
    return this.service.findAll(
      schoolId,
      query.page,
      query.limit,
      query.q,
      query.classId,
      query.levelId,
      query.cycle,
      query.gender,
      query.ageRange,
      query.status,
      query.enrollmentStatus,
      query.onlyNew,
      query.onlyUnpaid,
      query.sortField,
      query.sortDirection,
      user,
    );
  }

  @Get("stats")
  @RequirePermissions("student:view")
  @ApiOperation({ summary: "Statistiques des eleves" })
  async stats(@CurrentUser() user: CurrentUserPayload) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;
    return this.service.getStats(schoolId, user);
  }

  @Get(":id")
  @RequirePermissions("student:view")
  @ApiOperation({ summary: "Detail d un eleve" })
  async findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Get(":id/pathway")
  @RequirePermissions("student:view")
  @ApiOperation({ summary: "Parcours scolaire de l eleve" })
  async getPathway(@Param("id") id: string) {
    return this.service.getPathway(id);
  }

  @Get(":id/documents")
  @RequirePermissions("student:view")
  @ApiOperation({ summary: "Documents de l eleve" })
  async getDocuments(@Param("id") id: string) {
    return this.service.getDocuments(id);
  }

  @Get(":id/siblings")
  @RequirePermissions("student:view")
  @ApiOperation({ summary: "Freres et soeurs de l eleve" })
  async getSiblings(@Param("id") id: string) {
    return this.service.getSiblings(id);
  }

  @Post()
  @RequirePermissions("student:create")
  @ApiOperation({ summary: "Creer un eleve" })
  async create(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(StudentCreateSchema)) dto: any,
  ) {
    return this.service.create(dto, userId);
  }

  @Post("import/preview")
  @RequirePermissions("student:create")
  @ApiOperation({ summary: "Apercu de l'import Excel" })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async importPreview(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("Aucun fichier fourni");
    if (!user.schoolId) throw new BadRequestException("Utilisateur sans ecole");
    return this.service.importPreview(file.buffer, user.schoolId);
  }

  @Post("import/confirm")
  @RequirePermissions("student:create")
  @ApiOperation({ summary: "Confirmer l'import Excel" })
  async importConfirm(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { students: any[] },
  ) {
    if (!body.students || !Array.isArray(body.students)) {
      throw new BadRequestException("Liste d'eleves invalide");
    }
    if (!user.schoolId) throw new BadRequestException("Utilisateur sans ecole");
    return this.service.importConfirm(body.students, user.schoolId, user.id);
  }

  @Patch(":id")
  @RequirePermissions("student:update")
  @ApiOperation({ summary: "Modifier un eleve" })
  async update(@Param("id") id: string, @Body(new ZodValidationPipe(StudentUpdateSchema)) dto: any) {
    return this.service.update(id, dto);
  }

  @Post(":id/documents")
  @RequirePermissions("student:update")
  @ApiOperation({ summary: "Ajouter un document" })
  async addDocument(
    @Param("id") studentId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: { type: string; fileUrl: string; fileName?: string; mimeType?: string; sizeBytes?: number },
  ) {
    return this.service.addDocument(studentId, dto, userId);
  }

  @Delete(":id/documents/:documentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("student:update")
  @ApiOperation({ summary: "Supprimer un document" })
  async removeDocument(@Param("id") studentId: string, @Param("documentId") documentId: string) {
    await this.service.removeDocument(studentId, documentId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("student:delete")
  @ApiOperation({ summary: "Supprimer un eleve" })
  async remove(@Param("id") id: string) {
    await this.service.remove(id);
  }

  @Get("export/csv")
  @RequirePermissions("student:export")
  @ApiOperation({ summary: "Exporter les eleves en CSV" })
  async exportCSV(
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
    @Query("classId") classId?: string,
    @Query("levelId") levelId?: string,
    @Query("status") status?: string,
    @Query("enrollmentStatus") enrollmentStatus?: "NOUVEAU" | "ANCIEN" | "REDOUBLANT",
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;
    const csv = await this.service.exportCSV(schoolId, classId, levelId, status, enrollmentStatus);

    const filename = `eleves-${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get("export/excel")
  @RequirePermissions("student:export")
  @ApiOperation({ summary: "Exporter les eleves en Excel" })
  async exportExcel(
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
    @Query("classId") classId?: string,
    @Query("levelId") levelId?: string,
    @Query("status") status?: string,
    @Query("enrollmentStatus") enrollmentStatus?: "NOUVEAU" | "ANCIEN" | "REDOUBLANT",
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;

    const school = schoolId
      ? await this.prisma.school.findUnique({ where: { id: schoolId } })
      : null;
    if (!school?.name) throw new BadRequestException("Le nom de l'établissement n'est pas configuré."); const schoolName = school.name;

    const buffer = await this.service.exportExcel(
      schoolId,
      schoolName,
      classId,
      levelId,
      status,
      enrollmentStatus,
    );

    const filename = `eleves-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post("id-cards/batch")
  @RequirePermissions("student:view")
  @ApiOperation({ summary: "Generer les cartes scolaires (PDF)" })
  async generateIdCards(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { classId?: string; studentIds?: string[]; format?: "A4" | "PVC"; includeVerso?: boolean },
    @Res() res: Response,
  ) {
    if (!user.schoolId) throw new BadRequestException("Ecole introuvable");
    if (!body?.classId && (!body?.studentIds || body.studentIds.length === 0)) {
      throw new BadRequestException("Fournir classId ou studentIds[]");
    }

    const format = body.format === "PVC" ? "PVC" : "A4";
    const includeVerso = !!body.includeVerso;

    const pdf = await this.service.generateIdCardsBatch(user.schoolId, {
      classId: body.classId,
      studentIds: body.studentIds,
      format,
      includeVerso,
    });

    const filenameSuffix = body.classId
      ? `classe-${body.classId.slice(0, 8)}`
      : `eleves-${body.studentIds!.length}`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="cartes-${filenameSuffix}.pdf"`,
    );
    res.setHeader("Content-Length", pdf.length);
    res.end(pdf);
  }

  @Get("export/pdf")
  @RequirePermissions("student:export")
  @ApiOperation({ summary: "Exporter les eleves en PDF" })
  async exportPDF(
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
    @Query("classId") classId?: string,
    @Query("levelId") levelId?: string,
    @Query("status") status?: string,
    @Query("enrollmentStatus") enrollmentStatus?: "NOUVEAU" | "ANCIEN" | "REDOUBLANT",
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;

    const school = schoolId
      ? await this.prisma.school.findUnique({ where: { id: schoolId } })
      : null;
    if (!school?.name) throw new BadRequestException("Le nom de l'établissement n'est pas configuré."); const schoolName = school.name;
    const schoolAddress = school?.address || undefined;

    const buffer = await this.service.exportPDF(
      schoolId,
      schoolName,
      schoolAddress,
      classId,
      levelId,
      status,
      enrollmentStatus,
    );

    const filename = `eleves-${new Date().toISOString().split("T")[0]}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}