import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AcademicYearCreateDto, AcademicYearUpdateDto } from "./dto";
import { CurrentUserPayload } from "../common/decorators";
import { assertSchoolAccess } from "../common/utils";

@Injectable()
export class AcademicYearsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(schoolId: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: {
        id: true,
        label: true,
        isCurrent: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });

    if (!year) {
      throw new NotFoundException("Aucune année scolaire en cours");
    }

    return year;
  }

  async findAll(schoolId: string | null, page = 1, limit = 20) {
    const where = schoolId ? { schoolId } : {};
    const [data, total] = await Promise.all([
      this.prisma.academicYear.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: "desc" },
        include: {
          _count: { select: { classes: true, enrollments: true, terms: true } },
        },
      }),
      this.prisma.academicYear.count({ where }),
    ]);
    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
      include: { terms: { orderBy: { orderIndex: "asc" } } },
    });
    if (!year) throw new NotFoundException("Annee scolaire introuvable");
    assertSchoolAccess(user, year.schoolId, "Annee scolaire introuvable");
    return year;
  }

  async create(dto: AcademicYearCreateDto) {
    const existing = await this.prisma.academicYear.findFirst({
      where: { schoolId: dto.schoolId, label: dto.label },
    });
    if (existing) throw new BadRequestException("Cette annee scolaire existe deja pour cet etablissement");

    if (dto.isCurrent) {
      await this.prisma.academicYear.updateMany({
        where: { schoolId: dto.schoolId, isCurrent: true },
        data: { isCurrent: false },
      });
    }

    return this.prisma.academicYear.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      } as any,
    });
  }

  async update(id: string, dto: AcademicYearUpdateDto, user: CurrentUserPayload) {
    const year = await this.findOne(id, user);
    if (year.status === "CLOTUREE" || year.status === "ARCHIVEE") {
      throw new BadRequestException("Impossible de modifier une annee cloturee ou archivee");
    }

    if (dto.isCurrent) {
      await this.prisma.academicYear.updateMany({
        where: { schoolId: year.schoolId, isCurrent: true, id: { not: id } },
        data: { isCurrent: false },
      });
    }

    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    return this.prisma.academicYear.update({ where: { id }, data });
  }

  async activate(id: string, user: CurrentUserPayload) {
    const year = await this.findOne(id, user);
    await this.prisma.academicYear.updateMany({
      where: { schoolId: year.schoolId, isCurrent: true },
      data: { isCurrent: false },
    });
    return this.prisma.academicYear.update({
      where: { id },
      data: { status: "ACTIVE", isCurrent: true },
    });
  }

  async getClosingSummary(id: string, user: CurrentUserPayload) {
    const year = await this.findOne(id, user);

    const [
      pendingEnrollments,
      unpaidInvoices,
      openCashSessions,
      draftReportCards,
      totalStudents,
      totalClasses,
    ] = await Promise.all([
      this.prisma.enrollment.count({
        where: {
          academicYearId: id,
          status: "PENDING",
        },
      }),
      this.prisma.invoice.count({
        where: {
          academicYearId: id,
          status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
        },
      }),
      this.prisma.cashSession.count({
        where: {
          schoolId: year.schoolId,
          status: "OPEN",
        },
      }),
      this.prisma.reportCard.count({
        where: {
          academicYearId: id,
          status: "DRAFT",
        },
      }),
      this.prisma.enrollment.count({
        where: {
          academicYearId: id,
          status: "VALIDATED",
        },
      }),
      this.prisma.class.count({
        where: { academicYearId: id },
      }),
    ]);

    const blockers: Array<{ type: string; count: number; label: string; severity: "error" | "warning" }> = [];

    if (pendingEnrollments > 0) {
      blockers.push({
        type: "pending-enrollments",
        count: pendingEnrollments,
        label: "Inscriptions en attente",
        severity: "error",
      });
    }
    if (openCashSessions > 0) {
      blockers.push({
        type: "open-cash-sessions",
        count: openCashSessions,
        label: "Caisses ouvertes",
        severity: "error",
      });
    }

    const warnings: Array<{ type: string; count: number; label: string }> = [];

    if (unpaidInvoices > 0) {
      warnings.push({
        type: "unpaid-invoices",
        count: unpaidInvoices,
        label: "Factures impayees",
      });
    }
    if (draftReportCards > 0) {
      warnings.push({
        type: "draft-report-cards",
        count: draftReportCards,
        label: "Bulletins non publies",
      });
    }

    return {
      year: {
        id: year.id,
        label: year.label,
        status: year.status,
        startDate: year.startDate,
        endDate: year.endDate,
        isCurrent: year.isCurrent,
      },
      totalStudents,
      totalClasses,
      pendingEnrollments,
      unpaidInvoices,
      openCashSessions,
      draftReportCards,
      blockers,
      warnings,
      canClose: blockers.length === 0,
    };
  }

  async close(id: string, user: CurrentUserPayload) {
    await this.findOne(id, user);
    return this.prisma.academicYear.update({
      where: { id },
      data: { status: "CLOTUREE", isCurrent: false, closedAt: new Date() },
    });
  }

  async archive(id: string, user: CurrentUserPayload) {
    await this.findOne(id, user);
    return this.prisma.academicYear.update({
      where: { id },
      data: { status: "ARCHIVEE", archivedAt: new Date() },
    });
  }

  async remove(id: string, user: CurrentUserPayload) {
    const year = await this.findOne(id, user);
    if (year.status === "ACTIVE") {
      throw new BadRequestException("Impossible de supprimer une annee active");
    }
    return this.prisma.academicYear.delete({ where: { id } });
  }
}