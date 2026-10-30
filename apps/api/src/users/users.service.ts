import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcryptjs";
import { CurrentUserPayload } from "../common/decorators";
import { assertSchoolAccess, isSuperAdmin } from "../common/utils";

/**
 * Mot de passe provisoire attribue par defaut aux nouveaux utilisateurs
 * et lors d'une reinitialisation. L'utilisateur DOIT le changer a sa
 * premiere connexion (mustChangePassword = true).
 */
// La constante est supprimÃ©e, on utilise generateTempPassword()


@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifie qu'un utilisateur cible existe et que l'appelant a le droit d'y acceder.
   * - 404 si l'utilisateur n'existe pas ou appartient a une autre ecole (anti-enumeration)
   * - 403 si la cible est SUPER_ADMIN et que l'appelant ne l'est pas
   */
  private async getTargetOrFail(id: string, caller: CurrentUserPayload) {
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        schoolId: true,
        userRoles: { select: { role: { select: { code: true } } } },
      },
    });
    if (!target) throw new NotFoundException("Utilisateur introuvable");
    assertSchoolAccess(caller, target.schoolId, "Utilisateur introuvable");
    const targetIsSuperAdmin = target.userRoles.some((ur) => ur.role.code === "SUPER_ADMIN");
    if (targetIsSuperAdmin && !isSuperAdmin(caller)) {
      throw new ForbiddenException("Action reservee au super administrateur");
    }
    return target;
  }

  async findAll(schoolId: string | null, page = 1, limit = 20, q?: string) {
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;
    if (q) {
      where.OR = [
        { email: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, email: true, phone: true, firstName: true, lastName: true,
          status: true, lastLoginAt: true, createdAt: true,
          userRoles: { select: { role: { select: { id: true, code: true, name: true } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, caller: CurrentUserPayload) {
    await this.getTargetOrFail(id, caller);
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, phone: true, firstName: true, lastName: true,
        status: true, schoolId: true, lastLoginAt: true, createdAt: true,
        mustChangePassword: true,
        userRoles: { select: { role: { select: { id: true, code: true, name: true } } } },
        teacher: { select: { id: true, matricule: true, firstName: true, lastName: true } },
      },
    });
    if (!user) throw new NotFoundException("Utilisateur introuvable");
    return user;
  }

  async create(dto: {
    schoolId?: string;
    email?: string;
    phone?: string;
    password?: string;
    firstName: string;
    lastName: string;
    roleIds: string[];
    teacherId?: string;
    guardianId?: string;
  }, caller: CurrentUserPayload) {
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) throw new ConflictException("Cet email est deja utilise");
    }

    const provisionalPassword = dto.password && dto.password.trim().length > 0
      ? dto.password
      : this.generateTempPassword();
    const passwordHash = await bcrypt.hash(provisionalPassword, 12);

    // Verifier que les roles existent et que l'appelant a le droit de les attribuer
    const roles = await this.prisma.role.findMany({
      where: { id: { in: dto.roleIds } },
      select: { id: true, code: true },
    });
    if (roles.length !== new Set(dto.roleIds).size) {
      throw new BadRequestException("Un ou plusieurs roles sont invalides");
    }
    const targetIsSuperAdmin = roles.some((r) => r.code === "SUPER_ADMIN");
    if (targetIsSuperAdmin && !isSuperAdmin(caller)) {
      throw new ForbiddenException("Seul un super administrateur peut attribuer le role SUPER_ADMIN");
    }

    const createdUser = await this.prisma.user.create({
      data: {
        schoolId: dto.schoolId,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: "ACTIVE",
        mustChangePassword: !targetIsSuperAdmin,
        userRoles: {
          create: dto.roleIds.map((roleId) => ({
            roleId,
            schoolId: dto.schoolId,
          })),
        },
      },
      select: {
        id: true, email: true, phone: true, firstName: true, lastName: true,
        status: true, createdAt: true,
        userRoles: { select: { role: { select: { id: true, code: true, name: true } } } },
      },
    });

    // Si teacherId fourni, lier la fiche Teacher a ce user
    if (dto.teacherId) {
      await this.prisma.teacher.update({
        where: { id: dto.teacherId },
        data: { userId: createdUser.id },
      });
    }

    // Si guardianId fourni, lier la fiche Guardian a ce user
    if (dto.guardianId) {
      await this.prisma.guardian.update({
        where: { id: dto.guardianId },
        data: { userId: createdUser.id },
      });
    }

    return { user: createdUser, provisionalPassword };
  }

  async update(id: string, dto: any, caller: CurrentUserPayload) {
    const target = await this.getTargetOrFail(id, caller);

    const data: any = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      status: dto.status,
    };

    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, id: { not: id } },
      });
      if (existing) throw new ConflictException("Cet email est deja utilise");
      data.email = dto.email;
    }

    // Si roleIds fourni, on remplace tous les roles
    if (dto.roleIds && Array.isArray(dto.roleIds)) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      await this.prisma.userRole.createMany({
        data: dto.roleIds.map((roleId: string) => ({
          userId: id,
          roleId,
          schoolId: target.schoolId,
        })),
      });
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, phone: true, firstName: true, lastName: true,
        status: true,
        userRoles: { select: { role: { select: { id: true, code: true, name: true } } } },
      },
    });
  }

  async remove(id: string, caller: CurrentUserPayload) {
    const target = await this.getTargetOrFail(id, caller);

    if (target.id === caller.id) {
      throw new BadRequestException("Vous ne pouvez pas supprimer votre propre compte");
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });

    if (user?.userRoles.some((ur) => ur.role.code === "SUPER_ADMIN")) {
      const superAdmins = await this.prisma.user.count({
        where: { userRoles: { some: { role: { code: "SUPER_ADMIN" } } } },
      });
      if (superAdmins <= 1) {
        throw new BadRequestException("Impossible de supprimer le dernier SUPER_ADMIN");
      }
    }

    return this.prisma.user.delete({ where: { id } });
  }

  async resetPassword(id: string, caller: CurrentUserPayload) {
    await this.getTargetOrFail(id, caller);
    const provisionalPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(provisionalPassword, 12);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
      select: { id: true, email: true },
    });
    // Deconnecter toutes les sessions ouvertes de cet utilisateur
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { user: updated, provisionalPassword };
  }

  async listRoles(caller: CurrentUserPayload) {
    return this.prisma.role.findMany({
      where: isSuperAdmin(caller) ? {} : { code: { not: "SUPER_ADMIN" } },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true, description: true },
    });
  }

  /**
   * Genere un mot de passe temporaire aleatoire (13 caracteres).
   */
  private generateTempPassword(): string {
    const { randomInt } = require("crypto");
    const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
    const digits = "23456789";
    let pwd = "";
    for (let i = 0; i < 4; i++) pwd += letters.charAt(randomInt(letters.length));
    for (let i = 0; i < 4; i++) pwd += digits.charAt(randomInt(digits.length));
    for (let i = 0; i < 4; i++) pwd += letters.charAt(randomInt(letters.length));
    return pwd + "!";
  }
}
