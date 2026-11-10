import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
  ALLOW_NO_PERMISSIONS_KEY,
  CurrentUserPayload,
} from '../decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // ✅ FAIL-CLOSED : si aucune permission n'est déclarée,
    // on rejette SAUF si la route est explicitement marquée
    // @AllowNoPermissions() (routes globales authentifiées).
    if (!required || required.length === 0) {
      const allowNoPerms = this.reflector.getAllAndOverride<boolean>(
        ALLOW_NO_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (allowNoPerms) return true;

      const user = context.switchToHttp().getRequest().user as CurrentUserPayload;
      this.logger.error(
        `[SECURITE] Route sans @RequirePermissions et sans @AllowNoPermissions : ` +
        `${context.getClass().name}.${context.getHandler().name} — user=${user?.id}`,
      );
      throw new ForbiddenException(
        'Acces refuse : aucune permission declaree sur cette route. ' +
        'Ajoutez @RequirePermissions ou @AllowNoPermissions.',
      );
    }

    const user = context.switchToHttp().getRequest().user as CurrentUserPayload;
    if (!user) throw new ForbiddenException('Utilisateur non authentifie');
    if (user.roles?.includes('SUPER_ADMIN')) return true;

    const hasPermission = required.some((perm) => user.permissions?.includes(perm));
    if (!hasPermission) {
      this.logger.warn(`User ${user.id} denied. Required: ${required.join(' OR ')}`);
      throw new ForbiddenException(`Acces refuse. Permission requise : ${required.join(' ou ')}`);
    }
    return true;
  }
}