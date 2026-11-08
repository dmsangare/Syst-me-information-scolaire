import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AttendanceStudentService {
  constructor(private prisma: PrismaService) {}

  async getStudentSummary(schoolId: string, studentId: string, academicYearId?: string) {
    const year = academicYearId
      ? await this.prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } })
      : await this.prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });

    if (!year) throw new NotFoundException("Année scolaire introuvable");

    const records = await this.prisma.dailyAttendanceRecord.findMany({
      where: { studentId, session: { schoolId, academicYearId: year.id } },
      include: { session: { select: { date: true, classId: true } } },
      orderBy: { session: { date: "desc" } },
    });

    let totalDays = records.length;
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let justifiedDays = 0;
    let unjustifiedDays = 0;
    let pendingDays = 0;
    let lastAbsenceDate: Date | null = null;

    for (const r of records) {
      if (r.status === "PRESENT") presentDays++;
      else if (r.status === "LATE") { lateDays++; presentDays++; }
      else if (r.status === "ABSENT") {
        absentDays++;
        if (r.justificationStatus === "PENDING") pendingDays++;
        else if (r.justificationStatus === "ACCEPTED") justifiedDays++;
        else if (r.justificationStatus === "REJECTED") unjustifiedDays++;
      } else if (r.status === "ABSENT_JUSTIFIED") { absentDays++; justifiedDays++; }
      else if (r.status === "ABSENT_UNJUSTIFIED") { absentDays++; unjustifiedDays++; }

      if (!lastAbsenceDate && r.status.startsWith("ABSENT")) lastAbsenceDate = r.session.date;
    }

    const sortedByDate = [...records].sort(
      (a, b) => a.session.date.getTime() - b.session.date.getTime()
    );
    let consecutive = 0;
    let maxConsecutive = 0;
    for (const r of sortedByDate) {
      if (r.status.startsWith("ABSENT")) {
        consecutive++;
        maxConsecutive = Math.max(maxConsecutive, consecutive);
      } else consecutive = 0;
    }

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true, firstName: true, lastName: true, matricule: true },
    });

    return {
      student,
      academicYear: { id: year.id, label: year.label },
      stats: {
        totalDays, presentDays, absentDays, lateDays,
        justifiedDays, unjustifiedDays, pendingDays,
        maxConsecutiveAbsences: maxConsecutive,
        lastAbsenceDate,
        rate: totalDays > 0 ? Math.round((presentDays / totalDays) * 1000) / 10 : 0,
      },
    };
  }

  async getStudentHistory(schoolId: string, studentId: string, academicYearId?: string) {
    const year = academicYearId
      ? await this.prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } })
      : await this.prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });

    if (!year) throw new NotFoundException("Année scolaire introuvable");

    const records = await this.prisma.dailyAttendanceRecord.findMany({
      where: { studentId, session: { schoolId, academicYearId: year.id } },
      include: {
        session: { include: { class: { select: { id: true, name: true } } } },
        justifier: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { session: { date: "desc" } },
    });

    return {
      academicYear: { id: year.id, label: year.label },
      history: records.map((r) => ({
        id: r.id,
        date: r.session.date,
        className: r.session.class?.name ?? null,
        status: r.status,
        justificationStatus: r.justificationStatus,
        justificationReason: r.justificationReason,
        justifiedAt: r.justifiedAt,
        justifiedBy: r.justifier ? `${r.justifier.firstName} ${r.justifier.lastName}` : null,
        observation: r.observation,
      })),
    };
  }
}
