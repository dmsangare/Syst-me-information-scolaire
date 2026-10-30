import { z } from "zod";

/**
 * Schema de validation pour PATCH /users/:id
 *
 * Regles :
 * - Pas de schoolId : un utilisateur ne peut pas changer l'ecole d'un autre utilisateur via PATCH.
 *   Si un transfert d'ecole est necessaire, il doit passer par un endpoint dedie.
 * - Pas de password : le mot de passe se change via POST /auth/password/change
 *   ou POST /users/:id/reset-password.
 * - Pas de mustChangePassword : c'est le systeme qui le gere.
 * - strict() : rejette les champs inconnus.
 */
export const UpdateUserSchema = z.strictObject({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    phone: z
      .string()
      .regex(/^\+?\d{8,15}$/, "Numero de telephone invalide")
      .optional(),
    status: z
      .enum(["ACTIVE", "INACTIVE", "SUSPENDED", "LOCKED"])
      .optional(),
    roleIds: z.array(z.string().uuid()).min(1).optional(),
  });

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;