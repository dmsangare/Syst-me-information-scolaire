import { SetMetadata } from '@nestjs/common';

export const ALLOW_NO_PERMISSIONS_KEY = 'allowNoPermissions';

/**
 * Marque une route comme accessible à tout utilisateur authentifié,
 * même si aucun @RequirePermissions n'est déclaré.
 *
 * À utiliser UNIQUEMENT pour les routes globales (ex: GET /auth/me,
 * GET /notifications/unread-count). Ne JAMAIS utiliser pour des
 * données sensibles (élèves, finances, notes...).
 */
export const AllowNoPermissions = () => SetMetadata(ALLOW_NO_PERMISSIONS_KEY, true);