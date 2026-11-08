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

  // 1. Rôles "admin" : SUPER_ADMIN, DIRECTOR, PROMOTEUR → AdminDashboard
  if (
    roles.includes("SUPER_ADMIN") ||
    roles.includes("DIRECTOR") ||
    roles.includes("PROMOTEUR")
  ) {
    return <AdminDashboard />;
  }

  // 2. Élève et Parent → redirection vers /report-cards
  if (roles.includes("STUDENT") || roles.includes("PARENT")) {
    return <Navigate to="/report-cards" replace />;
  }

  // 3. Enseignant
  if (roles.includes("TEACHER")) {
    return <TeacherDashboard />;
  }

  // 4. Surveillant
  if (roles.includes("SUPERVISOR")) {
    return <SupervisorDashboard />;
  }

  // 5. Secrétaire
  if (roles.includes("SECRETARY")) {
    return <SecretaryDashboard />;
  }

  // 6. Par défaut (ACCOUNTANT, etc.) : AdminDashboard
  return <AdminDashboard />;
}