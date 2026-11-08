import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AttendanceAlertsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Détecte les élèves avec 2+ jours consécutifs d'absence (non justifiée).
   * À appeler après chaque enregistrement d'appel.
   */
  async detectConsecutiveAbsences(schoolId: string, date: string) {
    const dateObj = new Date(date + "T00:00:00.000Z");

    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
    });
    if (!currentYear) return { created: 0 };

    // Récupérer les 7 derniers jours pour avoir un contexte
    const last7Days = new Date(dateObj);
    last7Days.setDate(last7Days.getDate() - 7);

    const records = await this.prisma.dailyAttendanceRecord.findMany({
      where: {
        session: {
          schoolId,
          academicYearId: currentYear.id,
          date: { gte: last7Days, lte: dateObj },
        },
        status: { in: ["ABSENT", "ABSENT_UNJUSTIFIED"] },
      },
      include: {
        session: { select: { date: true } },
      },
      orderBy: { session: { date: "asc" } },
    });

    // Grouper par élève
    const byStudent = new Map<string, Date[]>();
    for (const r of records) {
      if (!byStudent.has(r.studentId)) byStudent.set(r.studentId, []);
      byStudent.get(r.studentId)!.push(r.session.date);
    }

    // Détecter les 2 jours consécutifs
    let createdCount = 0;
    for (const [studentId, dates] of byStudent.entries()) {
      const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
      let consecutive = 1;
      for (let i = 1; i < sorted.length; i++) {
        const diff = sorted[i].getTime() - sorted[i - 1].getTime();
        const oneDay = 24 * 60 * 60 * 1000;
        // Tolérance 3 jours (pour week-ends)
        if (diff <= 3 * oneDay) {
          consecutive++;
          if (consecutive >= 2) {
            // Créer une alerte si elle n'existe pas déjà
            const existing = await this.prisma.attendanceAlert.findFirst({
              where: {
                schoolId,
                studentId,
                academicYearId: currentYear.id,
                status: { in: ["NEW", "IN_PROGRESS", "PARENT_CONTACTED"] },
              },
            });
            if (!existing) {
              await this.prisma.attendanceAlert.create({
                data: {
                  schoolId,
                  studentId,
                  academicYearId: currentYear.id,
                  level: 2,
                  type: "CONSECUTIVE_DAYS",
                  reason: `Absent ${consecutive} jours consécutifs`,
                  status: "NEW",
                },
              });
              createdCount++;
            }
            break;
          }
        } else {
          consecutive = 1;
        }
      }
    }

    return { created: createdCount };
  }

  async getAlerts(schoolId: string, status?: string) {
    const where: any = { schoolId };
    if (status) where.status = status;

    const alerts = await this.prisma.attendanceAlert.findMany({
      where,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, matricule: true },
        },
        resolver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { detectedAt: "desc" },
    });

    return { data: alerts };
  }

  async updateAlertStatus(
    schoolId: string,
    userId: string,
    alertId: string,
    dto: { status: string; notes?: string },
  ) {
    const alert = await this.prisma.attendanceAlert.findFirst({
      where: { id: alertId, schoolId },
    });
    if (!alert) throw new Error("Alerte introuvable");

    const data: any = {
      status: dto.status,
      notes: dto.notes ?? alert.notes,
    };
    if (dto.status === "RESOLVED" || dto.status === "DISMISSED") {
      data.resolvedAt = new Date();
      data.resolvedBy = userId;
    }

    return this.prisma.attendanceAlert.update({
      where: { id: alertId },
      data,
    });
  }
}