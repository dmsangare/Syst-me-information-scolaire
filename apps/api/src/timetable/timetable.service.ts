import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TimetableSlotCreateDto, TimetableSlotUpdateDto } from "./dto";

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    schoolId: string | null,
    academicYearId?: string,
    classId?: string,
    teacherId?: string,
    user?: { id: string; roles: string[] },
  ) {
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;
    if (academicYearId) where.academicYearId = academicYearId;
    if (classId) where.classId = classId;
    if (teacherId) where.teacherId = teacherId;

    // FILTRE ELEVE : ne voir que l emploi du temps de sa classe
    if (user && user.roles.includes("STUDENT")) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { student: { userId: user.id } },
        select: { classId: true },
        orderBy: { enrollmentDate: "desc" },
      });
      where.classId = enrollment?.classId || "00000000-0000-0000-0000-000000000000";
    }

    // FILTRE PARENT : ne voir que l emploi du temps de ses enfants
    if (user && user.roles.includes("PARENT")) {
      const parent = await this.prisma.guardian.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });
      if (parent) {
        const childrenEnrollments = await this.prisma.enrollment.findMany({
          where: { student: { guardians: { some: { guardianId: parent.id } } } },
          select: { classId: true },
          distinct: ["classId"],
        });
        const classIds = childrenEnrollments.map((e) => e.classId);
        where.classId = { in: classIds.length > 0 ? classIds : ["00000000-0000-0000-0000-000000000000"] };
      } else {
        where.classId = "00000000-0000-0000-0000-000000000000";
      }
    }

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

    return this.prisma.timetableSlot.findMany({
      where,
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      include: {
        subject: { select: { id: true, code: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, code: true, name: true } },
        room: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: string) {
    const slot = await this.prisma.timetableSlot.findUnique({
      where: { id },
      include: {
        subject: true,
        teacher: true,
        class: true,
        room: true,
        academicYear: true,
      },
    });
    if (!slot) throw new NotFoundException("Creneau introuvable");
    return slot;
  }

  /**
   * Verifier les conflits avant creation :
   * - Conflit classe : meme classe, meme jour, meme heure
   * - Conflit enseignant : meme enseignant, meme jour, meme heure
   * - Conflit salle : meme salle, meme jour, meme heure
   */
  async checkConflicts(dto: TimetableSlotCreateDto, excludeId?: string) {
    const where: any = {
      dayOfWeek: dto.dayOfWeek,
      startTime: new Date(`1970-01-01T${dto.startTime}:00Z`),
      ...(excludeId ? { id: { not: excludeId } } : {}),
    };

    const [classConflicts, teacherConflicts, roomConflicts] = await Promise.all([
      this.prisma.timetableSlot.findMany({
        where: { ...where, classId: dto.classId },
        include: { subject: true, teacher: true },
      }),
      this.prisma.timetableSlot.findMany({
        where: { ...where, teacherId: dto.teacherId },
        include: { subject: true, class: true },
      }),
      dto.roomId
        ? this.prisma.timetableSlot.findMany({
            where: { ...where, roomId: dto.roomId },
            include: { subject: true, class: true },
          })
        : Promise.resolve([]),
    ]);

    return {
      hasConflicts: classConflicts.length > 0 || teacherConflicts.length > 0 || roomConflicts.length > 0,
      classConflicts,
      teacherConflicts,
      roomConflicts,
    };
  }

  async create(dto: TimetableSlotCreateDto) {
    const conflicts = await this.checkConflicts(dto);
    if (conflicts.hasConflicts) {
      throw new ConflictException({
        message: "Conflits detectes dans l emploi du temps",
        details: {
          class: conflicts.classConflicts.length,
          teacher: conflicts.teacherConflicts.length,
          room: conflicts.roomConflicts.length,
          items: {
            classConflicts: conflicts.classConflicts,
            teacherConflicts: conflicts.teacherConflicts,
            roomConflicts: conflicts.roomConflicts,
          },
        },
      });
    }

    return this.prisma.timetableSlot.create({
      data: {
        ...dto,
        startTime: new Date(`1970-01-01T${dto.startTime}:00Z`),
        endTime: new Date(`1970-01-01T${dto.endTime}:00Z`),
      } as any,
      include: {
        subject: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
        class: true,
        room: true,
      },
    });
  }

  async update(id: string, dto: TimetableSlotUpdateDto) {
    const existing = await this.findOne(id);
    const merged = { ...existing, ...dto } as any;

    if (dto.dayOfWeek || dto.startTime || dto.classId || dto.teacherId || dto.roomId) {
      const conflicts = await this.checkConflicts(
        {
          schoolId: merged.schoolId,
          academicYearId: merged.academicYearId,
          classId: merged.classId,
          subjectId: merged.subjectId,
          teacherId: merged.teacherId,
          roomId: merged.roomId,
          dayOfWeek: merged.dayOfWeek,
          startTime: typeof merged.startTime === "string" ? merged.startTime : this.formatTime(merged.startTime),
          endTime: typeof merged.endTime === "string" ? merged.endTime : this.formatTime(merged.endTime),
          weekPattern: merged.weekPattern,
        },
        id,
      );
      if (conflicts.hasConflicts) {
        throw new ConflictException("Conflits detectes dans l emploi du temps");
      }
    }

    const data: any = { ...dto };
    if (dto.startTime) data.startTime = new Date(`1970-01-01T${dto.startTime}:00Z`);
    if (dto.endTime) data.endTime = new Date(`1970-01-01T${dto.endTime}:00Z`);

    return this.prisma.timetableSlot.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.timetableSlot.delete({ where: { id } });
  }

  async getByClass(classId: string) {
    return this.prisma.timetableSlot.findMany({
      where: { classId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      include: {
        subject: { select: { id: true, code: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        room: { select: { id: true, name: true } },
      },
    });
  }

  async getByTeacher(teacherId: string) {
    return this.prisma.timetableSlot.findMany({
      where: { teacherId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      include: {
        subject: { select: { id: true, code: true, name: true } },
        class: { select: { id: true, code: true, name: true } },
        room: { select: { id: true, name: true } },
      },
    });
  }

  async removeByClass(classId: string, academicYearId: string) {
    const result = await this.prisma.timetableSlot.deleteMany({
      where: { classId, academicYearId },
    });
    return { deleted: result.count };
  }

  private formatTime(date: Date | string): string {
    if (typeof date === "string") return date;
    const h = String(date.getUTCHours()).padStart(2, "0");
    const m = String(date.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
}
