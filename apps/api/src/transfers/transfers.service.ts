import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { randomBytes } from "crypto";
import * as QRCode from "qrcode";
import { generateTransferCertificate } from "./utils/transfer-certificate.util";
import { PdfGeneratorService } from '../common/pdf';

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfGenerator: PdfGeneratorService,
  ) {}

  /**
   * Genere un code de verification unique (8 caracteres alphanumeriques).
   */
  private generateVerificationCode(): string {
    return randomBytes(6).toString("base64url").slice(0, 8).toUpperCase();
  }

  /**
   * Liste des transferts avec filtres.
   */
  async findAll(
    schoolId: string | null,
    page = 1,
    limit = 20,
    type?: "IN" | "OUT",
    status?: "PENDING" | "VERIFIED" | "REJECTED" | "ARCHIVED",
    q?: string,
  ) {
    const where: any = {};

    if (schoolId) {
      // Les transferts concernant cette ecole (entrants ou sortants)
      where.OR = [
        { student: { schoolId } },
        { createdBy: { not: null } },
      ];
    }
    if (type) where.type = type;
    if (status) where.status = status;

    if (q) {
      where.OR = [
        ...(where.OR || []),
        { student: { firstName: { contains: q, mode: "insensitive" } } },
        { student: { lastName: { contains: q, mode: "insensitive" } } },
        { student: { matricule: { contains: q, mode: "insensitive" } } },
        { fromSchool: { contains: q, mode: "insensitive" } },
        { toSchool: { contains: q, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.studentTransfer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: {
              id: true,
              matricule: true,
              firstName: true,
              lastName: true,
              gender: true,
              birthDate: true,
              photoUrl: true,
            },
          },
        },
      }),
      this.prisma.studentTransfer.count({ where }),
    ]);

    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  /**
   * Detail d'un transfert.
   */
  async findOne(id: string) {
    const transfer = await this.prisma.studentTransfer.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            enrollments: {
              where: { status: "VALIDATED" },
              orderBy: { enrollmentDate: "desc" },
              take: 1,
              include: {
                class: { select: { id: true, code: true, name: true } },
                level: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!transfer) throw new NotFoundException("Transfert introuvable");
    return transfer;
  }

  /**
   * Recherche par code de verification (page publique).
   */
  async findByVerificationCode(code: string) {
    const transfer = await this.prisma.studentTransfer.findUnique({
      where: { verificationCode: code },
      include: {
        student: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            gender: true,
            birthDate: true,
          },
        },
      },
    });
    if (!transfer) throw new NotFoundException("Code de verification invalide");
    return transfer;
  }

  /**
   * Transfert SORTANT : un eleve quitte l'etablissement.
   */
  async createOutbound(
    dto: {
      studentId: string;
      toSchool: string;
      toSchoolAddress?: string;
      toSchoolPhone?: string;
      toSchoolDirector?: string;
      reason: "DEMENAGEMENT" | "PASSAGE" | "DISCIPLINE" | "FAMILIALE" | "AUTRE";
      reasonDetails?: string;
      effectiveDate: string;
      notes?: string;
    },
    createdBy: string,
  ) {
    // Verifier que l'eleve existe
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      include: {
        enrollments: {
          where: { status: "VALIDATED" },
          orderBy: { enrollmentDate: "desc" },
          take: 1,
          include: { class: true, level: true, academicYear: true },
        },
      },
    });
    if (!student) throw new NotFoundException("Eleve introuvable");

    // Calculer la moyenne annuelle si possible
    let previousAverage: number | null = null;
    const lastReportCard = await this.prisma.reportCard.findFirst({
      where: { studentId: dto.studentId },
      orderBy: { publishedAt: "desc" },
    });
    if (lastReportCard?.average) {
      previousAverage = Number(lastReportCard.average);
    }

    // Determiner la decision de passage (a partir du dernier bulletin)
    let decision: string | null = null;
    if (lastReportCard?.decision) {
      decision = lastReportCard.decision;
    }

    // Generer le code de verification
    const verificationCode = this.generateVerificationCode();

    const transfer = await this.prisma.studentTransfer.create({
      data: {
        studentId: dto.studentId,
        type: "OUT",
        fromSchool: "Etablissement actuel",
        toSchool: dto.toSchool,
        toSchoolAddress: dto.toSchoolAddress,
        toSchoolPhone: dto.toSchoolPhone,
        toSchoolDirector: dto.toSchoolDirector,
        reason: dto.reason,
        reasonDetails: dto.reasonDetails,
        effectiveDate: new Date(dto.effectiveDate),
        verificationCode,
        status: "PENDING",
        previousMatricule: student.matricule,
        previousClassLevel: student.enrollments[0]?.level?.code || null,
        previousAverage,
        decision,
        notes: dto.notes,
        createdBy,
      },
      include: {
        student: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Mettre a jour le statut de l'eleve
    await this.prisma.student.update({
      where: { id: dto.studentId },
      data: { status: "TRANSFERRED" },
    });

    this.logger.log(`Transfert sortant cree: ${transfer.id} pour eleve ${student.matricule}`);

    return transfer;
  }

  /**
   * Transfert ENTRANT : un eleve rejoint l'etablissement.
   */
  async createInbound(
    dto: {
      studentId: string;
      fromSchool: string;
      fromSchoolAddress?: string;
      fromSchoolPhone?: string;
      fromSchoolDirector?: string;
      reason: "DEMENAGEMENT" | "PASSAGE" | "DISCIPLINE" | "FAMILIALE" | "AUTRE";
      reasonDetails?: string;
      effectiveDate: string;
      previousMatricule?: string;
      previousClassLevel?: string;
      previousAverage?: number;
      decision?: string;
      certificateUrl?: string;
      notes?: string;
    },
    createdBy: string,
  ) {
    // Verifier que l'eleve existe
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException("Eleve introuvable");

    const verificationCode = this.generateVerificationCode();

    const transfer = await this.prisma.studentTransfer.create({
      data: {
        studentId: dto.studentId,
        type: "IN",
        fromSchool: dto.fromSchool,
        fromSchoolAddress: dto.fromSchoolAddress,
        fromSchoolPhone: dto.fromSchoolPhone,
        fromSchoolDirector: dto.fromSchoolDirector,
        toSchool: "Etablissement actuel",
        reason: dto.reason,
        reasonDetails: dto.reasonDetails,
        effectiveDate: new Date(dto.effectiveDate),
        verificationCode,
        status: "VERIFIED",
        verifiedAt: new Date(),
        verifiedBy: createdBy,
        previousMatricule: dto.previousMatricule,
        previousClassLevel: dto.previousClassLevel,
        previousAverage: dto.previousAverage,
        decision: dto.decision,
        certificateUrl: dto.certificateUrl,
        notes: dto.notes,
        createdBy,
      },
      include: {
        student: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    this.logger.log(`Transfert entrant cree: ${transfer.id} pour eleve ${student.matricule}`);

    return transfer;
  }

  /**
   * Verifier un transfert (approuver).
   */
  async verify(id: string, verifiedBy: string) {
    const transfer = await this.findOne(id);
    if (transfer.status === "VERIFIED") {
      throw new BadRequestException("Ce transfert est deja verifie");
    }

    return this.prisma.studentTransfer.update({
      where: { id },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
        verifiedBy,
      },
    });
  }

  /**
   * Rejeter un transfert.
   */
  async reject(id: string, reason: string) {
    await this.findOne(id);

    return this.prisma.studentTransfer.update({
      where: { id },
      data: {
        status: "REJECTED",
        reasonDetails: reason,
      },
    });
  }

  /**
   * Archiver un transfert.
   */
  async archive(id: string) {
    await this.findOne(id);
    return this.prisma.studentTransfer.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
  }

  /**
   * Statistiques des transferts.
   */
  async getStats(schoolId: string | null) {
    const where: any = {};
    if (schoolId) where.student = { schoolId };

    const [totalIn, totalOut, pending, verified, rejected, byReason] = await Promise.all([
      this.prisma.studentTransfer.count({ where: { ...where, type: "IN" } }),
      this.prisma.studentTransfer.count({ where: { ...where, type: "OUT" } }),
      this.prisma.studentTransfer.count({ where: { ...where, status: "PENDING" } }),
      this.prisma.studentTransfer.count({ where: { ...where, status: "VERIFIED" } }),
      this.prisma.studentTransfer.count({ where: { ...where, status: "REJECTED" } }),
      this.prisma.studentTransfer.groupBy({
        by: ["reason"],
        where,
        _count: true,
      }),
    ]);

    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      pending,
      verified,
      rejected,
      byReason: byReason.map((r) => ({
        reason: r.reason,
        count: r._count,
      })),
    };
  }

  /**
   * Supprimer un transfert (uniquement PENDING).
   */
  async remove(id: string) {
    const transfer = await this.findOne(id);
    if (transfer.status === "VERIFIED") {
      throw new BadRequestException("Impossible de supprimer un transfert verifie");
    }
    return this.prisma.studentTransfer.delete({ where: { id } });
  }

  /**
   * Genere un QR code (data URL) pour un transfert.
   */
  async generateQRCode(transferId: string, baseUrl: string): Promise<string> {
    const transfer = await this.findOne(transferId);
    const verifyUrl = `${baseUrl}/verify/${transfer.verificationCode}`;
    return QRCode.toDataURL(verifyUrl, {
      width: 300,
      margin: 2,
      color: { dark: "#1E40AF", light: "#FFFFFF" },
    });
  }

  /**
   * Genere le certificat de transfert en PDF.
   */
  async generateCertificate(
    transferId: string,
    baseUrl: string,
    schoolName: string,
    schoolAddress?: string | null,
    schoolPhone?: string | null,
    schoolDirector?: string | null,
    schoolMotto?: string | null,
  ): Promise<Buffer> {
    const transfer = await this.findOne(transferId);

    const studentName = `${transfer.student.lastName} ${transfer.student.firstName}`;
    const verifyUrl = `${baseUrl}/verify/${transfer.verificationCode}`;

    return generateTransferCertificate({
      // Eleve
      studentName,
      studentMatricule: transfer.student.matricule,
      studentGender: transfer.student.gender,
      studentBirthDate: transfer.student.birthDate,
      studentBirthPlace: transfer.student.birthPlace,
      // Ecole
      schoolName,
      schoolAddress,
      schoolPhone,
      schoolLogoUrl: null,
      schoolDirector,
      schoolMotto,
      // Transfert
      transferType: transfer.type as "IN" | "OUT",
      fromSchool: transfer.fromSchool,
      toSchool: transfer.toSchool,
      reason: transfer.reason,
      reasonDetails: transfer.reasonDetails,
      effectiveDate: transfer.effectiveDate,
      previousMatricule: transfer.previousMatricule,
      previousClassLevel: transfer.previousClassLevel,
      previousAverage: transfer.previousAverage ? Number(transfer.previousAverage) : null,
      decision: transfer.decision,
      // Verification
      verificationCode: transfer.verificationCode,
      verifyUrl,
      issuedAt: new Date(),
    }, this.pdfGenerator);
  }

}
