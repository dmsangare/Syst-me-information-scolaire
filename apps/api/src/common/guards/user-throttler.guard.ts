import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.user?.id || req.ip;
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, limit, ttl, throttler } = requestProps;
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    // ✅ EXEMPTION 1 : Admin, Directeur et Comptable ne sont JAMAIS limités
    if (user && user.roles) {
      const privilegedRoles = ['SUPER_ADMIN', 'DIRECTOR', 'SECRETARY'];
      const isPrivileged = user.roles.some((role: string) => 
        privilegedRoles.includes(role)
      );
      if (isPrivileged) return true;
    }

    // ✅ EXEMPTION 2 : Si la requête n'est pas authentifiée (token expiré, 401),
    // on ne la compte pas. On laisse JwtAuthGuard renvoyer le 401.
    // Cela évite qu'un utilisateur légitime soit bloqué 1h à cause d'un token expiré.
    if (!user) {
      return true;
    }

    // Pour les autres (enseignants authentifiés), on applique la limite
    return super.handleRequest(requestProps);
  }
}