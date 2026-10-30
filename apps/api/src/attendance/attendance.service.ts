import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AttendanceSessionCreateDto, AttendanceBulkUpdateDto, AttendanceRecordDto } from "./dto";

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page = 1,
    limit = 20,
    classId?: string,
    termId?: string,
    teacherId?: string,
    date?: string,
    user?: { id: string; roles: string[] },
  ) {
    const where: any = {};
    if (classId) where.classId = classId;
    if (termId) where.termId = termId;
    if (teacherId) where.teacherId = teacherId;
    if (date) where.date = new Date(date);

    // FILTRE TEACHER : forcer le teacherId si TEACHER connecte
    const isTeacherOnly =
      user &&
      user.roles.includes("TEACHER") &&
      !user.roles.includes("SUPER_ADMIN") &&
      !user.roles.includes("DIRECTOR") &&
      !user.roles.includes("SECRETARY");

    if (isTeacherOnly && user) {
      const teacher = await this.prisma.teacher.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });
      where.teacherId = teacher?.id || "00000000-0000-0000-0000-000000000000";
    }

    const [data, total] = await Promise.all([
      this.prisma.attendanceSession.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          class: { select: { id: true, code: true, name: true } },
          subject: { select: { id: true, code: true, name: true } },
          teacher: { select: { id: true, firstName: true, lastName: true } },
          term: { select: { id: true, name: true } },
          _count: { select: { records: true } },
        },
      }),
      this.prisma.attendanceSession.count({ where }),
    ]);

    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id },
      include: {
        class: true,
        subject: true,
        teacher: true,
        term: true,
        records: {
          include: {
            student: {
              select: {
                id: true, matricule: true, firstName: true, lastName: true, gender: true, photoUrl: true,
              },
            },
          },
          orderBy: { student: { lastName: "asc" } },
        },
      },
    });
    if (!session) throw new NotFoundException("Session de presence introuvable");
    return session;
  }

  async create(dto: AttendanceSessionCreateDto) {
    const session = await this.prisma.attendanceSession.create({
      data: {
        classId: dto.classId,
        subjectId: dto.subjectId || null,
        teacherId: dto.teacherId,
        termId: dto.termId,
        date: new Date(dto.date),
        startTime: new Date(`1970-01-01T${dto.startTime}:00Z`),
        endTime: new Date(`1970-01-01T${dto.endTime}:00Z`),
        records: {
          create: dto.records.map((r: any) => ({
            studentId: r.studentId,
            status: r.status as any,
            justification: r.justification,
          })),
        },
      } as any,
      include: {
        records: { include: { student: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    return session;
  }

  async updateRecords(sessionId: string, dto: AttendanceBulkUpdateDto) {
    await this.findOne(sessionId);

    // Supprimer les anciens enregistrements et recreer
    await this.prisma.attendanceRecord.deleteMany({ where: { sessionId } });

    await this.prisma.attendanceRecord.createMany({
      data: dto.records.map((r: any) => ({
        sessionId,
        studentId: r.studentId,
        status: r.status as any,
        justification: r.justification,
      })),
    });

    return this.findOne(sessionId);
  }

  async justifyRecord(recordId: string, justification: string) {
    const record = await this.prisma.attendanceRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new NotFoundException("Enregistrement introuvable");

    if (record.status !== "ABSENT" && record.status !== "ABSENT_UNJUSTIFIED") {
      throw new BadRequestException("Seules les absences peuvent etre justifiees");
    }

    return this.prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        status: "ABSENT_JUSTIFIED",
        justification,
        justifiedAt: new Date(),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.attendanceSession.delete({ where: { id } });
  }

  /**
   * Statistiques par eleve : absences, retards, taux de presence
   */
  async getStudentStats(studentId: string, termId?: string) {
    const where: any = { studentId };
    if (termId) where.session = { termId };

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: { session: true },
    });

    const stats = {
      total: records.length,
      present: records.filter((r) => r.status === "PRESENT").length,
      absent: records.filter((r) => r.status === "ABSENT" || r.status === "ABSENT_UNJUSTIFIED").length,
      absentJustified: records.filter((r) => r.status === "ABSENT_JUSTIFIED").length,
      late: records.filter((r) => r.status === "LATE").length,
    };

    const presenceRate = stats.total > 0
      ? Math.round(((stats.present + stats.late) / stats.total) * 100)
      : 100;

    return { ...stats, presenceRate };
  }

  /**
   * Statistiques par classe
   */
  async getClassStats(classId: string, termId?: string) {
    const where: any = { classId };
    if (termId) where.termId = termId;

    const sessions = await this.prisma.attendanceSession.findMany({
      where,
      include: { records: true },
    });

    const allRecords = sessions.flatMap((s) => s.records);
    const total = allRecords.length;
    const present = allRecords.filter((r) => r.status === "PRESENT").length;
    const late = allRecords.filter((r) => r.status === "LATE").length;
    const absent = allRecords.filter((r) => r.status === "ABSENT" || r.status === "ABSENT_UNJUSTIFIED").length;
    const absentJustified = allRecords.filter((r) => r.status === "ABSENT_JUSTIFIED").length;

    return {
      sessionsCount: sessions.length,
      total,
      present,
      late,
      absent,
      absentJustified,
      presenceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 100,
    };
  }

  /**
   * Absences du jour pour une ecole
   */
  async getTodayAbsences(schoolId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sessions = await this.prisma.attendanceSession.findMany({
      where: {
        class: { schoolId },
        date: { gte: today, lt: tomorrow },
      },
      include: {
        records: {
          where: { status: { in: ["ABSENT", "ABSENT_UNJUSTIFIED", "ABSENT_JUSTIFIED"] } },
          include: {
            student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
          },
        },
        class: { select: { id: true, code: true, name: true } },
      },
    });

    return sessions.flatMap((s) =>
      s.records.map((r: any) => ({
        ...r,
        class: s.class,
        sessionDate: s.date,
      })),
    );
  }
}
