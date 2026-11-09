import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ParentContactsService {
  constructor(private prisma: PrismaService) {}

  async create(
    schoolId: string,
    userId: string,
    dto: {
      studentId: string;
      guardianId?: string;
      alertId?: string;
      method: string;
      result: string;
      notes?: string;
      nextAction?: string;
      followUpDate?: string;
    },
  ) {
    const contact = await this.prisma.parentContact.create({
      data: {
        schoolId,
        studentId: dto.studentId,
        guardianId: dto.guardianId ?? null,
        alertId: dto.alertId ?? null,
        method: dto.method,
        result: dto.result,
        notes: dto.notes ?? null,
        nextAction: dto.nextAction ?? null,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
        contactedBy: userId,
      },
      include: {
        guardian: { select: { id: true, firstName: true, lastName: true, phone: true } },
        contactedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Si l'alerte est liée et que le contact est "REACHED" ou "RESOLVED", on met à jour son statut
    if (dto.alertId && (dto.result === "REACHED" || dto.result === "RESOLVED")) {
      await this.prisma.attendanceAlert.update({
        where: { id: dto.alertId },
        data: { status: "PARENT_CONTACTED" },
      });
    }

    return contact;
  }

  async findByStudent(schoolId: string, studentId: string) {
    const contacts = await this.prisma.parentContact.findMany({
      where: { schoolId, studentId },
      include: {
        guardian: { select: { id: true, firstName: true, lastName: true, phone: true } },
        contactedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { contactDate: "desc" },
    });

    return { data: contacts };
  }
}