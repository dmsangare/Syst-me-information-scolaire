import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationCreateDto, NotificationBulkDto } from "./dto";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(schoolId: string | null, page = 1, limit = 20, filters: {
    userId?: string; guardianId?: string; status?: string; type?: string; unreadOnly?: boolean;
  } = {}) {
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.guardianId) where.guardianId = filters.guardianId;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.unreadOnly) where.readAt = null;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException("Notification introuvable");
    return notification;
  }

  async create(dto: NotificationCreateDto) {
    return this.prisma.notification.create({
      data: {
        ...dto,
        userId: dto.userId || null,
        guardianId: dto.guardianId || null,
        status: "PENDING",
      } as any,
    });
  }

  async markAsRead(id: string) {
    await this.findOne(id);
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date(), status: "READ" },
    });
  }

  async markAllAsRead(userId?: string, guardianId?: string) {
    const where: any = { readAt: null };
    if (userId) where.userId = userId;
    if (guardianId) where.guardianId = guardianId;

    const result = await this.prisma.notification.updateMany({
      where,
      data: { readAt: new Date(), status: "READ" },
    });
    return { updated: result.count };
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.notification.delete({ where: { id } });
  }

  /**
   * Envoi en masse a plusieurs destinataires.
   * Cree une notification pour chaque destinataire.
   */
  async sendBulk(dto: NotificationBulkDto) {
    const created = await this.prisma.$transaction(
      dto.recipientIds.map((recipientId: any) =>
        this.prisma.notification.create({
          data: {
            schoolId: dto.schoolId,
            userId: recipientId,
            type: dto.type as any,
            title: dto.title,
            body: dto.body,
            channel: dto.channel as any,
            status: "PENDING",
          },
        }),
      ),
    );

    return { created: created.length };
  }

  /**
   * Marque une notification comme envoyee (apres envoi SMS/WhatsApp/Email).
   */
  async markAsSent(id: string) {
    await this.findOne(id);
    return this.prisma.notification.update({
      where: { id },
      data: { sentAt: new Date(), status: "SENT" },
    });
  }

  /**
   * Compte les notifications non lues pour un utilisateur.
   */
  async countUnread(userId?: string, guardianId?: string) {
    const where: any = { readAt: null };
    if (userId) where.userId = userId;
    if (guardianId) where.guardianId = guardianId;

    return this.prisma.notification.count({ where });
  }
}
