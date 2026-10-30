import { ReportCardsService } from "../report-cards/report-cards.service";
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUserPayload } from "../common/decorators";
import {
  AnnualDecisionProposeDto,
  AnnualDecisionValidateDto,
  AnnualDecisionListQueryDto,
} from "./dto";

@Injectable()
export class AnnualDecisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportCards: ReportCardsService, // ✅ Ajout
  ) {}

  async list(query: AnnualDecisionListQueryDto, user: CurrentUserPayload) {
    // Récupérer les StudentPathway pour cette classe + année
    const pathways = await this.prisma.studentPathway.findMany({
      where: {
        classId: query.classId,
        academicYearId: query.academicYearId,
      },
      include: {
        student: {
          select: { id: true, matricule: true, firstName: true, lastName: true, schoolId: true },
        },
      },
      orderBy: { student: { lastName: "asc" } },
    });

    // Filtrer par école
    const filtered = user.schoolId
      ? pathways.filter((p) => p.student.schoolId === user.schoolId)
      : pathways;

    // Filtrer par décision
    const result = query.filter === "ALL"
      ? filtered
      : filtered.filter((p) => p.decision === query.filter);

    return {
      data: result.map((p) => ({
        id: p.id,
        studentId: p.studentId,
        studentName: `${p.student.lastName} ${p.student.firstName}`,
        matricule: p.student.matricule,
        decision: p.decision,
        result: p.result,
      })),
      meta: {
        total: result.length,
        admis: filtered.filter((p) => p.decision === "ADMIS").length,
        redoublants: filtered.filter((p) => p.decision === "REDOUBLE").length,
        aExaminer: filtered.filter((p) => p.decision === "A_EXAMINER").length,
      },
    };
  }

  async propose(dto: AnnualDecisionProposeDto, user: CurrentUserPayload) {
    // Vérifier que le ReportCard existe et est accessible
    const reportCard = await this.prisma.reportCard.findUnique({
      where: { id: dto.reportCardId },
      include: { student: { select: { schoolId: true } } },
    });
    if (!reportCard) throw new NotFoundException("Bulletin introuvable");
    if (user.schoolId && reportCard.student.schoolId !== user.schoolId) {
      throw new ForbiddenException("Accès interdit");
    }

    // Créer ou mettre à jour le StudentPathway
    const existing = await this.prisma.studentPathway.findFirst({
      where: {
        studentId: reportCard.studentId,
        academicYearId: reportCard.academicYearId,
      },
    });

    if (existing) {
      return this.prisma.studentPathway.update({
        where: { id: existing.id },
        data: {
          decision: dto.decision,
          result: dto.decision === "ADMIS" ? "PASSED" : dto.decision === "REDOUBLE" ? "REPEATED" : null,
        },
      });
    }

    // Récupérer la classe + level
    const cls = await this.prisma.class.findUnique({
      where: { id: reportCard.classId },
      select: { levelId: true },
    });

    return this.prisma.studentPathway.create({
      data: {
        studentId: reportCard.studentId,
        academicYearId: reportCard.academicYearId,
        levelId: cls?.levelId ?? "",
        classId: reportCard.classId,
        decision: dto.decision,
        result: dto.decision === "ADMIS" ? "PASSED" : dto.decision === "REDOUBLE" ? "REPEATED" : null,
      },
    });
  }

  async validate(id: string, dto: AnnualDecisionValidateDto, user: CurrentUserPayload) {
    const pathway = await this.prisma.studentPathway.findUnique({
      where: { id },
      include: { student: { select: { schoolId: true } } },
    });
    if (!pathway) throw new NotFoundException("Décision introuvable");
    if (user.schoolId && pathway.student.schoolId !== user.schoolId) {
      throw new ForbiddenException("Accès interdit");
    }

    return this.prisma.studentPathway.update({
      where: { id },
      data: { decision: dto.decision },
    });
  }

  async reopen(id: string, motive: string, user: CurrentUserPayload) {
    const pathway = await this.prisma.studentPathway.findUnique({
      where: { id },
      include: { student: { select: { schoolId: true } } },
    });
    if (!pathway) throw new NotFoundException("Décision introuvable");
    if (user.schoolId && pathway.student.schoolId !== user.schoolId) {
      throw new ForbiddenException("Accès interdit");
    }

    // Remettre à A_DETERMINER
    return this.prisma.studentPathway.update({
      where: { id },
      data: { decision: "A_EXAMINER", result: null },
    });
  }

  // ✅ NOUVELLE MÉTHODE : Suggestion automatique de décision
  async suggestDecision(studentId: string, academicYearId: string, user: CurrentUserPayload) {
    // Vérifier l'accès école
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, academicYearId, status: "VALIDATED" },
      include: { student: { select: { schoolId: true } } },
    });
    if (!enrollment) throw new NotFoundException("Élève non inscrit");
    if (user.schoolId && enrollment.student.schoolId !== user.schoolId) {
      throw new ForbiddenException("Accès interdit");
    }

    return this.reportCards.computeAnnualAverage(studentId, academicYearId);
  }
}