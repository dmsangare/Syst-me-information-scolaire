import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  requiredPermission?: string;
  requiredRole?: string;
  children?: ReactNode;
}

export function ProtectedRoute({
  requiredPermission,
  requiredRole,
  children,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si l'utilisateur doit changer son mot de passe, on le force
  // SAUF :
  //   - s'il est SUPER_ADMIN (le patron est libre)
  //   - s'il est deja sur la page dediee (sinon boucle infinie)
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;
  if (
    user?.mustChangePassword &&
    !isSuperAdmin &&
    location.pathname !== "/change-password-required"
  ) {
    return <Navigate to="/change-password-required" replace />;
  }

  // Premiere installation : si l'utilisateur n'a pas d'ecole,
  // on le force a en créer une (sauf s'il est deja sur la page)
  if (
    isAuthenticated &&
    !user?.schoolId &&
    location.pathname !== "/init-school"
  ) {
    return <Navigate to="/init-school" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    if (location.pathname === "/dashboard" && (hasRole("STUDENT") || hasRole("PARENT"))) {
      return <Navigate to="/report-cards" replace />;
    }
    return <Navigate to="/forbidden" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/forbidden" replace />;
  }

  // Si un enfant est fourni, on l'affiche (mode "wrapper")
  // Sinon, on affiche l'Outlet (mode "route parent")
  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
}


