import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { AdminDashboard } from "./AdminDashboard";
import { TeacherDashboard } from "./TeacherDashboard";
import { SupervisorDashboard } from "./SupervisorDashboard";
import { SecretaryDashboard } from "./SecretaryDashboard";

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const roles = user.roles || [];

  // 1. Élève et Parent → redirigés vers leurs bulletins
  if (roles.includes("STUDENT") || roles.includes("PARENT")) {
    return <Navigate to="/report-cards" replace />;
  }

  // 2. Enseignant
  if (roles.includes("TEACHER") && !roles.includes("SUPER_ADMIN") && !roles.includes("DIRECTOR")) {
    return <TeacherDashboard />;
  }

  // 3. Surveillant
  if (roles.includes("SUPERVISOR") && !roles.includes("SUPER_ADMIN") && !roles.includes("DIRECTOR")) {
    return <SupervisorDashboard />;
  }

  // 4. Secrétaire
  if (roles.includes("SECRETARY") && !roles.includes("SUPER_ADMIN") && !roles.includes("DIRECTOR")) {
    return <SecretaryDashboard />;
  }

  // 5. Admin (par défaut)
  return <AdminDashboard />;
}