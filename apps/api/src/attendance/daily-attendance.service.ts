import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DailyAttendanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupère l'appel du jour pour une classe (ou null).
   */
  async getByClassAndDate(schoolId: string, classId: string, date: string) {
    const dateObj = new Date(date + "T00:00:00.000Z");

    const session = await this.prisma.dailyAttendance.findFirst({
      where: {
        schoolId,
        classId,
        date: dateObj,
      },
      include: {
        records: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                matricule: true,
                gender: true,
                photoUrl: true,
              },
            },
            justifier: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { student: { lastName: "asc" } },
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        class: { select: { id: true, name: true } },
      },
    });

    return session;
  }

  /**
   * Liste des classes avec l'état de l'appel du jour.
   */
  async getClassesStatus(schoolId: string, date: string, userId?: string) {
    const dateObj = new Date(date + "T00:00:00.000Z");

    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
    });

    if (!currentYear) {
      return { date, classes: [] };
    }

    let classIdsFilter: string[] | null = null;

    if (userId) {
      const teacher = await this.prisma.teacher.findFirst({
        where: { userId, schoolId },
        select: { id: true },
      });

      if (teacher) {
        const assignments = await this.prisma.teacherAssignment.findMany({
          where: { teacherId: teacher.id, academicYearId: currentYear.id },
          select: { classId: true },
        });

        const mainClasses = await this.prisma.class.findMany({
          where: { mainTeacherId: teacher.id, academicYearId: currentYear.id },
          select: { id: true },
        });

        classIdsFilter = [
          ...new Set([
            ...assignments.map((a) => a.classId),
            ...mainClasses.map((c) => c.id),
          ]),
        ];
      }
    }

    const classes = await this.prisma.class.findMany({
      where: {
        schoolId,
        academicYearId: currentYear.id,
        status: "OPEN",
        ...(classIdsFilter ? { id: { in: classIdsFilter } } : {}),
      },
      select: {
        id: true,
        name: true,
        level: { select: { name: true, cycle: true } },
        _count: { select: { enrollments: true } },
        dailyAttendances: {
          where: { date: dateObj },
          select: {
            id: true,
            createdAt: true,
            records: {
              select: { status: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return {
      date,
      classes: classes.map((c) => {
        const session = c.dailyAttendances[0];
        let status: "TODO" | "DONE" | "IN_PROGRESS" = "TODO";
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;

        if (session) {
          status = "DONE";
          for (const r of session.records) {
            if (r.status === "PRESENT") presentCount++;
            else if (r.status === "LATE") lateCount++;
            else if (r.status.startsWith("ABSENT")) absentCount++;
          }
        }

        return {
          classId: c.id,
          className: c.name,
          levelName: c.level?.name ?? null,
          cycle: c.level?.cycle ?? null,
          totalStudents: c._count.enrollments,
          sessionId: session?.id ?? null,
          status,
          presentCount,
          absentCount,
          lateCount,
          createdAt: session?.createdAt ?? null,
        };
      }),
    };
  }

  /**
   * Crée un appel quotidien avec tous les records.
   */
  async create(
    schoolId: string,
    userId: string,
    dto: {
      classId: string;
      date: string;
      records: Array<{
        studentId: string;
        status: string;
        observation?: string;
      }>;
    },
  ) {
    const dateObj = new Date(dto.date + "T00:00:00.000Z");

    const klass = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId },
      select: { id: true, academicYearId: true },
    });
    if (!klass) throw new NotFoundException("Classe introuvable");

    const existing = await this.prisma.dailyAttendance.findFirst({
      where: { classId: dto.classId, date: dateObj },
    });
    if (existing) {
      throw new BadRequestException(
        "Un appel existe déjà pour cette classe à cette date",
      );
    }

    const session = await this.prisma.dailyAttendance.create({
      data: {
        schoolId,
        classId: dto.classId,
        academicYearId: klass.academicYearId,
        date: dateObj,
        createdBy: userId,
        records: {
          create: dto.records.map((r) => ({
            studentId: r.studentId,
            status: r.status,
            observation: r.observation ?? null,
            justificationStatus:
              r.status === "ABSENT" ? "PENDING" : null,
          })),
        },
      },
      include: {
        records: true,
      },
    });

    return session;
  }

  /**
   * Modifie un appel existant (corrige un statut).
   */
  async updateRecord(
    schoolId: string,
    userId: string,
    recordId: string,
    dto: { status: string; observation?: string; reason?: string },
  ) {
    const record = await this.prisma.dailyAttendanceRecord.findFirst({
      where: {
        id: recordId,
        session: { schoolId },
      },
      include: { session: true },
    });
    if (!record) throw new NotFoundException("Enregistrement introuvable");

    if (dto.status !== record.status) {
      await this.prisma.attendanceCorrection.create({
        data: {
          sessionId: record.sessionId,
          studentId: record.studentId,
          oldStatus: record.status,
          newStatus: dto.status,
          reason: dto.reason ?? "Correction manuelle",
          correctedBy: userId,
        },
      });
    }

    return this.prisma.dailyAttendanceRecord.update({
      where: { id: recordId },
      data: {
        status: dto.status,
        observation: dto.observation ?? record.observation,
        justificationStatus:
          dto.status === "ABSENT" ? "PENDING" : record.justificationStatus,
      },
    });
  }

  /**
   * Justifie une absence (ACCEPTED ou REJECTED).
   */
  async justifyRecord(
    schoolId: string,
    userId: string,
    recordId: string,
    dto: { decision: "ACCEPTED" | "REJECTED"; reason: string; observation?: string },
  ) {
    const record = await this.prisma.dailyAttendanceRecord.findFirst({
      where: { id: recordId, session: { schoolId } },
      include: { session: true },
    });
    if (!record) throw new NotFoundException("Enregistrement introuvable");

    const newStatus =
      dto.decision === "ACCEPTED" ? "ABSENT_JUSTIFIED" : "ABSENT_UNJUSTIFIED";

    await this.prisma.attendanceCorrection.create({
      data: {
        sessionId: record.sessionId,
        studentId: record.studentId,
        oldStatus: record.status,
        newStatus: newStatus,
        reason: "Justification : " + dto.reason,
        correctedBy: userId,
      },
    });

    return this.prisma.dailyAttendanceRecord.update({
      where: { id: recordId },
      data: {
        status: newStatus,
        justificationStatus: dto.decision === "ACCEPTED" ? "ACCEPTED" : "REJECTED",
        justificationReason: dto.reason,
        justifiedAt: new Date(),
        justifiedBy: userId,
        observation: dto.observation ?? record.observation,
      },
    });
  }

  /**
   * Récupère les statistiques du jour (dashboard superviseur).
   */
  async getDayStats(schoolId: string, date: string) {
    const dateObj = new Date(date + "T00:00:00.000Z");

    const sessions = await this.prisma.dailyAttendance.findMany({
      where: { schoolId, date: dateObj },
      include: { records: true },
    });

    let expected = 0;
    let present = 0;
    let absent = 0;
    let late = 0;
    let justified = 0;
    let unjustified = 0;
    let pending = 0;

    for (const s of sessions) {
      for (const r of s.records) {
        expected++;
        if (r.status === "PRESENT") present++;
        else if (r.status === "LATE") late++;
        else if (r.status === "ABSENT") {
          absent++;
          if (r.justificationStatus === "PENDING") pending++;
        } else if (r.status === "ABSENT_JUSTIFIED") {
          absent++;
          justified++;
        } else if (r.status === "ABSENT_UNJUSTIFIED") {
          absent++;
          unjustified++;
        }
      }
    }

    const rate = expected > 0 ? ((present + late) / expected) * 100 : 0;

    return {
      date,
      expected,
      present,
      absent,
      late,
      justified,
      unjustified,
      pending,
      rate: Math.round(rate * 10) / 10,
    };
  }
}