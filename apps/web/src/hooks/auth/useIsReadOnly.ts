import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook qui renvoie true si l'utilisateur est en lecture seule.
 * Utilisé pour cacher les boutons d'action aux rôles comme PROMOTEUR.
 */
export function useIsReadOnly(): boolean {
  const { user } = useAuth();
  if (!user) return true;
  const roles = user.roles || [];
  const readOnlyRoles = ["PROMOTEUR"];
  return readOnlyRoles.some((role) => roles.includes(role));
}