import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook qui renvoie true si l'utilisateur est en lecture seule.
 * Utilisé pour cacher les boutons d'action aux rôles comme PROMOTEUR.
 */
export function useIsReadOnly(): boolean {
  try {
    const { user } = useAuth();
    if (!user) return false; // Pas connecté → pas en lecture seule (pour les pages publiques)
    const roles = user.roles || [];
    const readOnlyRoles = ["PROMOTEUR"];
    return readOnlyRoles.some((role) => roles.includes(role));
  } catch {
    // Si useAuth throw (hors AuthProvider), on assume lecture seule
    return false;
  }
}