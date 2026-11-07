import { useAuth } from "@/contexts/AuthContext";
import { AdminDashboard } from "./AdminDashboard";
import { TeacherDashboard } from "./TeacherDashboard";
import { SupervisorDashboard } from "./SupervisorDashboard";
import { SecretaryDashboard } from "./SecretaryDashboard";

export function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  const roles = user.roles || [];

  if (roles.includes("TEACHER") && !roles.includes("SUPER_ADMIN") && !roles.includes("DIRECTOR")) {
    return <TeacherDashboard />;
  }

  if (roles.includes("SUPERVISOR") && !roles.includes("SUPER_ADMIN") && !roles.includes("DIRECTOR")) {
    return <SupervisorDashboard />;
  }

  if (roles.includes("SECRETARY") && !roles.includes("SUPER_ADMIN") && !roles.includes("DIRECTOR")) {
    return <SecretaryDashboard />;
  }

  // Par defaut : dashboard admin (super admin, directeur, promoteur, comptable)
  return <AdminDashboard />;
}