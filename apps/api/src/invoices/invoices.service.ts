import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { InvoiceCreateDto, InvoiceCancelDto } from "./dto";
import { InstallmentsService } from "./installments.service";
import { InstallmentMode } from "@prisma/client";

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly installments: InstallmentsService,
  ) {}

  async findAll(schoolId: string | null, page = 1, limit = 20, filters: {
    studentId?: string; status?: string; academicYearId?: string; q?: string;
  } = {}) {
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.status) where.status = filters.status;
    if (filters.academicYearId) where.academicYearId = filters.academicYearId;

    if (filters.q) {
      where.OR = [
        { number: { contains: filters.q, mode: "insensitive" } },
        { student: { firstName: { contains: filters.q, mode: "insensitive" } } },
        { student: { lastName: { contains: filters.q, mode: "insensitive" } } },
        { student: { matricule: { contains: filters.q, mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { issuedAt: "desc" },
        include: {
          student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
          academicYear: { select: { id: true, label: true } },
          _count: { select: { items: true, payments: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        student: true,
        academicYear: true,
        items: { include: { feeType: true } },
        payments: {
          include: {
            receipt: true,
            cashier: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { paidAt: "desc" },
        },
      },
    });
    if (!invoice) throw new NotFoundException("Facture introuvable");
    return invoice;
  }

  async create(dto: InvoiceCreateDto) {
    // Calculer le total
    const totalAmount = dto.items.reduce(
      (sum: any, item: any) => sum + item.quantity * item.unitAmount,
      0,
    );

    // Generer le numero de facture
    const number = await this.generateInvoiceNumber(dto.schoolId);

    const invoice = await this.prisma.invoice.create({
      data: {
        schoolId: dto.schoolId,
        studentId: dto.studentId,
        academicYearId: dto.academicYearId,
        number,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        totalAmount,
        paidAmount: 0,
        balance: totalAmount,
        status: "UNPAID",
        items: {
          create: dto.items.map((item: any) => ({
            feeTypeId: item.feeTypeId,
            description: item.description,
            quantity: item.quantity,
            unitAmount: item.unitAmount,
            totalAmount: item.quantity * item.unitAmount,
          })),
        },
      } as any,
      include: {
        items: { include: { feeType: true } },
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
      },
    });

    // Generer l'echeancier selon le mode demande (CASH par defaut).
    // On ne bloque pas la creation si l'echeancier echoue : la facture existe deja.
    try {
      await this.installments.generateForInvoice({
        invoiceId: invoice.id,
        mode: (dto as any).installmentMode || "CASH",
        customCount: (dto as any).installmentCount,
        feeTypeLabel: "Facture",
        dayOfMonth: (dto as any).dayOfMonth || 15,
      });
    } catch (err: any) {
      this.logger.warn(
        `Echeancier non genere pour la facture ${invoice.number} : ${err?.message}`,
      );
    }

    return this.prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        items: { include: { feeType: true } },
        installments: { orderBy: { orderIndex: "asc" } },
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
      },
    });
  }

  /**
   * Facturation automatique : cree une facture pour un eleve
   * a partir de sa grille tarifaire (via son niveau et son annee).
   */
  async autoInvoice(schoolId: string, studentId: string, academicYearId: string) {
    // Recuperer l'inscription validee de l'eleve
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, academicYearId, status: "VALIDATED" },
    });
    if (!enrollment) {
      throw new BadRequestException("Aucune inscription validee trouvee pour cet eleve");
    }

    // Verifier qu'une facture n'existe pas deja
    const existing = await this.prisma.invoice.findFirst({
      where: { studentId, academicYearId, status: { not: "CANCELLED" } },
    });
    if (existing) {
      return existing; // Idempotent
    }

    // Recuperer la grille tarifaire
    // Seuls les frais INSCRIPTION, SCOLARITE et UNIFORME sont factures automatiquement.
    // Les frais CANTINE, TRANSPORT, EXAMEN, FOURNITURES, AUTRE sont optionnels
    // et ajoutes manuellement par l'agent.
    const structures = await this.prisma.feeStructure.findMany({
      where: {
        schoolId,
        academicYearId,
        OR: [{ levelId: enrollment.levelId }, { levelId: null }],
        feeType: {
          category: { in: ["INSCRIPTION", "SCOLARITE", "UNIFORME"] },
        },
      },
      include: { feeType: true },
    });

    if (structures.length === 0) {
      throw new BadRequestException("Aucune grille tarifaire trouvee pour cet eleve");
    }

    // Creer la facture
    const invoice = await this.create({
      schoolId,
      studentId,
      academicYearId,
      items: structures.map((s) => ({
        feeTypeId: s.feeTypeId,
        description: s.feeType.name,
        quantity: 1,
        unitAmount: Number(s.amount),
      })),
    });

    // Generer l'echeancier multi-frais selon la configuration
    // de chaque FeeStructure (champ installments).
    try {
      const blocks = structures.map((s) => {
        const n = s.installments || 1;
        let mode: InstallmentMode = "CASH";
        let customCount: number | undefined;

        if (n === 1) mode = "CASH";
        else if (n === 3) mode = "TRIMESTER";
        else if (n === 9) mode = "MONTHLY";
        else {
          mode = "CUSTOM";
          customCount = n;
        }

        return {
          feeTypeLabel: s.feeType.name,
          amount: Number(s.amount),
          mode,
          customCount,
          dueDate: s.dueDate ? new Date(s.dueDate) : null,
        };
      });

      await this.installments.generateForInvoiceMultiFee({
        invoiceId: invoice!.id,
        blocks,
        dayOfMonth: 15,
      });
    } catch (err: any) {
      this.logger.warn(
        `Echeancier multi-frais non genere pour ${invoice?.number} : ${err?.message}`,
      );
    }

    return this.prisma.invoice.findUnique({
      where: { id: invoice!.id },
      include: {
        items: { include: { feeType: true } },
        installments: { orderBy: { orderIndex: "asc" } },
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
      },
    });
  }

  /**
   * Apercu : combien d'eleves seront factures avec ce filtre.
   * Idempotent, ne modifie rien.
   */
  async previewAutoInvoiceBulk(
    schoolId: string,
    academicYearId: string,
    filter: { levelId?: string; classId?: string },
  ) {
    const where: any = { academicYearId, status: "VALIDATED" };
    if (filter.classId) where.classId = filter.classId;
    if (filter.levelId) where.levelId = filter.levelId;

    const enrollments = await this.prisma.enrollment.findMany({
      where,
      select: { studentId: true },
    });

    const total = enrollments.length;

    // Combien ont deja une facture
    const studentIds = enrollments.map((e) => e.studentId);
    const alreadyInvoiced = studentIds.length
      ? await this.prisma.invoice.count({
          where: {
            schoolId,
            academicYearId,
            studentId: { in: studentIds },
            status: { not: "CANCELLED" },
          },
        })
      : 0;

    return {
      total,
      alreadyInvoiced,
      toCreate: total - alreadyInvoiced,
    };
  }

  /**
   * Facturation en masse pour les eleves d'un niveau ou d'une classe.
   * Idempotent : les eleves deja factures sont ignores.
   */
  async autoInvoiceBulk(
    schoolId: string,
    academicYearId: string,
    filter: { levelId?: string; classId?: string },
  ) {
    const where: any = { academicYearId, status: "VALIDATED" };
    if (filter.classId) where.classId = filter.classId;
    if (filter.levelId) where.levelId = filter.levelId;

    const enrollments = await this.prisma.enrollment.findMany({
      where,
      select: { studentId: true },
    });

    if (enrollments.length === 0) {
      throw new BadRequestException(
        "Aucun eleve inscrit ne correspond a ce filtre",
      );
    }

    const results = {
      total: enrollments.length,
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [] as { studentId: string; message: string }[],
    };

    for (const e of enrollments) {
      try {
        const before = await this.prisma.invoice.findFirst({
          where: {
            studentId: e.studentId,
            academicYearId,
            status: { not: "CANCELLED" },
          },
          select: { id: true },
        });

        await this.autoInvoice(schoolId, e.studentId, academicYearId);

        if (before) {
          results.skipped++;
        } else {
          results.created++;
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push({
          studentId: e.studentId,
          message: err?.message || "Erreur inconnue",
        });
      }
    }

    return results;
  }

  async cancel(id: string, dto: InvoiceCancelDto) {
    const invoice = await this.findOne(id);
    if (invoice.status === "CANCELLED") {
      throw new BadRequestException("Cette facture est deja annulee");
    }
    if (invoice.payments.length > 0) {
      throw new BadRequestException("Impossible d annuler une facture avec des paiements. Annulez d abord les paiements.");
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });
  }

  async remove(id: string) {
    const invoice = await this.findOne(id);
    if (invoice.payments.length > 0) {
      throw new BadRequestException("Impossible de supprimer une facture avec des paiements");
    }
    return this.prisma.invoice.delete({ where: { id } });
  }

  /**
   * Recalcule le solde et le statut d'une facture
   * (appele apres chaque paiement).
   */
  async recalculateStatus(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: { where: { cancelledAt: null } } },
    });
    if (!invoice) return;

    const paidAmount = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = Number(invoice.totalAmount) - paidAmount;

    let status: any = "UNPAID";
    if (balance <= 0.001) status = "PAID";
    else if (paidAmount > 0) status = "PARTIAL";

    // Verifier l'echeance
    if (invoice.dueDate && new Date(invoice.dueDate) < new Date() && status !== "PAID") {
      status = "OVERDUE";
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount,
        balance: Math.max(balance, 0),
        status,
      },
    });
  }

  /**
   * Statistiques financieres globales.
   */
  async getDashboard(schoolId: string, academicYearId?: string) {
    const where: any = { schoolId };
    if (academicYearId) where.academicYearId = academicYearId;

    const invoices = await this.prisma.invoice.findMany({
      where: { ...where, status: { not: "CANCELLED" } },
    });

    const totalBilled = invoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);
    const totalPaid = invoices.reduce((sum, i) => sum + Number(i.paidAmount), 0);
    const totalUnpaid = invoices.reduce((sum, i) => sum + Number(i.balance), 0);

    return {
      totalBilled,
      totalPaid,
      totalUnpaid,
      invoicesCount: invoices.length,
      paidCount: invoices.filter((i) => i.status === "PAID").length,
      partialCount: invoices.filter((i) => i.status === "PARTIAL").length,
      unpaidCount: invoices.filter((i) => i.status === "UNPAID").length,
      overdueCount: invoices.filter((i) => i.status === "OVERDUE").length,
    };
  }

  private async generateInvoiceNumber(schoolId: string): Promise<string> {
    const year = new Date().getFullYear();
    const settingsData = await this.settings.getDataWithDefaults(schoolId);
    const invoicePrefix = (settingsData.numbering?.invoicePrefix ?? "FAC")
      .toString()
      .toUpperCase();
    const prefix = `${invoicePrefix}-${year}-`;

    const last = await this.prisma.invoice.findFirst({
      where: { schoolId, number: { startsWith: prefix } },
      orderBy: { number: "desc" },
    });

    let seq = 1;
    if (last) {
      const lastSeq = parseInt(last.number.slice(prefix.length), 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(6, "0")}`;
  }
}
