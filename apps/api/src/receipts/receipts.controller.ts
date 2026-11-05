import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Res,
  StreamableFile,
  NotFoundException,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ReceiptsService } from "./receipts.service";
import { RequirePermissions, CurrentUser, CurrentUserPayload } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";
import { PaginationDto } from "../common/dto/pagination.dto";
import { generateReceiptPDF } from "../payments/utils/receipt-pdf.util";
import { PdfGeneratorService } from '../common/pdf';
import { loadLogoAsBase64 } from "../common/utils/load-logo.util";
import { fileToBase64 } from "../common/utils/file-to-base64.util";

@ApiTags("Receipts")
@ApiBearerAuth("access-token")
@Controller("receipts")
@UseGuards(SchoolScopeGuard)
export class ReceiptsController {
  constructor(
    private readonly service: ReceiptsService,
    private readonly pdfGenerator: PdfGeneratorService,
  ) {}

  @Get()
  @RequirePermissions("payment:view")
  @ApiOperation({ summary: "Liste des recus" })
  async findAll(@CurrentUser() user: CurrentUserPayload, @Query() query: PaginationDto) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;
    return this.service.findAll(schoolId, query.page, query.limit);
  }

  @Get("number/:number")
  @RequirePermissions("payment:view")
  @ApiOperation({ summary: "Rechercher un recu par numero" })
  async findByNumber(@Param("number") number: string) {
    return this.service.findByNumber(number);
  }

  @Get(":id/pdf")
  @RequirePermissions("payment:view")
  @ApiOperation({ summary: "Telecharger le recu en PDF" })
  async downloadPdf(
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const receipt = await this.service.findOne(id);
    if (!receipt) throw new NotFoundException("Recu introuvable");

    const payment: any = (receipt as any).payment;
    if (!payment) throw new NotFoundException("Paiement associe introuvable");

    const school = payment.school || {};
    const student = payment.student || {};
    const invoice = payment.invoice || {};
    const cashier = payment.cashier || {};

    // Charger le logo en base64
    const schoolLogoBase64 = await loadLogoAsBase64(school.logoUrl);
    const schoolStampBase64 = await fileToBase64(school.stampUrl);

    const pdfBuffer = await generateReceiptPDF({
      schoolName: school.name || "Ecole",
      schoolLogoBase64,
      schoolStampBase64,
      schoolAddress: school.address,
      schoolPhone: school.phone,
      schoolMotto: school.motto,
      receiptNumber: (receipt as any).number || "—",
      issuedAt: (receipt as any).issuedAt || payment.paidAt,
      studentName: `${student.firstName || ""} ${student.lastName || ""}`.trim() || "—",
      studentMatricule: student.matricule || "—",
      studentClass: null, // TODO : recuperer la classe via enrollment
      invoiceNumber: invoice.number || "—",
      invoiceItems: Array.isArray((invoice as any).items)
        ? (invoice as any).items.map((it: any) => ({
            label: it.feeType?.name || it.description || "Frais",
            quantity: Number(it.quantity) || 1,
            unitAmount: Number(it.unitAmount) || 0,
            totalAmount: Number(it.totalAmount) || 0,
          }))
        : [],
      invoiceTotal: Number(invoice.totalAmount || 0),
      invoicePaid: Number(invoice.paidAmount || 0),
      invoiceBalance: Number(invoice.balance || 0),
      paymentAmount: Number(payment.amount || 0),
      paymentMethod: payment.method || "CASH",
      paymentReference: payment.reference || null,
      cashierName: `${cashier.firstName || ""} ${cashier.lastName || ""}`.trim() || null,
      verifyUrl: undefined, // TODO : URL de verification publique
    }, this.pdfGenerator);

    const filename = `recu-${(receipt as any).number || id}.pdf`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length,
    });

    return new StreamableFile(pdfBuffer);
  }

  @Get(":id")
  @RequirePermissions("payment:view")
  async findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }
}
