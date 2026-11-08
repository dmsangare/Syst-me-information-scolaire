import { Link } from "react-router-dom";
import {
  ClipboardCheck, Users, UserCheck, UserX, Clock, TrendingUp, AlertCircle, CheckCircle2,
} from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle, KpiCard, PageLoader, EmptyState, Button,
} from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useIsReadOnly } from "@/hooks/auth/useIsReadOnly";
import {
  useAttendanceClassesStatus,
  useAttendanceDayStats,
} from "@/hooks/attendance/useDailyAttendance";

const CYCLE_LABELS: Record<string, string> = {
  PREMIER_CYCLE: "1er cycle",
  DEUXIEME_CYCLE: "2e cycle",
  LYCEE: "Lycée",
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  TODO: { label: "À effectuer", className: "bg-amber-50 text-amber-700 border-amber-200" },
  IN_PROGRESS: { label: "En cours", className: "bg-blue-50 text-blue-700 border-blue-200" },
  DONE: { label: "Terminé", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export function AttendanceDashboardPage() {
  const { user } = useAuth();
  const isReadOnly = useIsReadOnly();
  const { data: stats, isLoading: statsLoading } = useAttendanceDayStats();
  const { data: classesData, isLoading: classesLoading } = useAttendanceClassesStatus();

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (statsLoading || classesLoading) {
    return <PageLoader label="Chargement des présences..." />;
  }

  const classes = classesData?.classes ?? [];
  const doneCount = classes.filter((c) => c.status === "DONE").length;
  const todoCount = classes.filter((c) => c.status === "TODO").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-sis-md bg-sis-brand-50 text-sis-brand mt-0.5">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Présences et assiduité</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {today} · Année scolaire active
            </p>
          </div>
        </div>
        {!isReadOnly && todoCount > 0 && (
          <Link to="/attendance/call">
            <Button size="lg">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Effectuer un appel
            </Button>
          </Link>
        )}
      </div>

      {/* Cartes stats du jour */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Élèves attendus"
          value={stats?.expected ?? 0}
          hint={`${doneCount}/${classes.length} classes appelées`}
          icon={<Users className="h-5 w-5" />}
          accent="brand"
        />
        <KpiCard
          label="Présents"
          value={stats?.present ?? 0}
          hint={`${stats?.late ?? 0} retard(s)`}
          icon={<UserCheck className="h-5 w-5" />}
          accent="success"
        />
        <KpiCard
          label="Absents"
          value={stats?.absent ?? 0}
          hint={`${stats?.pending ?? 0} justification(s) en attente`}
          icon={<UserX className="h-5 w-5" />}
          accent="danger"
        />
        <KpiCard
          label="Taux de présence"
          value={`${stats?.rate ?? 0}%`}
          hint="Calculé sur les appels du jour"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="info"
        />
      </div>

      {/* Liste des classes */}
      <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            État des appels par classe
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {classes.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Aucune classe"
                description="Aucune classe n'est configurée pour l'année en cours."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="border-b bg-slate-50">
                  <tr className="text-left text-xs font-medium text-slate-500 uppercase">
                    <th className="px-4 py-3">Classe</th>
                    <th className="px-4 py-3">Cycle</th>
                    <th className="px-4 py-3 text-center">Élèves</th>
                    <th className="px-4 py-3 text-center">Présents</th>
                    <th className="px-4 py-3 text-center">Absents</th>
                    <th className="px-4 py-3 text-center">Retards</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classes.map((c) => {
                    const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.TODO;
                    return (
                      <tr key={c.classId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{c.className}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {c.cycle ? CYCLE_LABELS[c.cycle] ?? c.cycle : "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">{c.totalStudents}</td>
                        <td className="px-4 py-3 text-center text-emerald-600 font-medium">
                          {c.presentCount}
                        </td>
                        <td className="px-4 py-3 text-center text-red-600 font-medium">
                          {c.absentCount}
                        </td>
                        <td className="px-4 py-3 text-center text-amber-600 font-medium">
                          {c.lateCount}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}
                          >
                            {c.status === "DONE" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : c.status === "IN_PROGRESS" ? (
                              <Clock className="h-3 w-3" />
                            ) : (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isReadOnly ? (
                            <Link
                              to={`/attendance/call?classId=${c.classId}`}
                              className="text-xs font-medium text-blue-600 hover:underline"
                            >
                              {c.status === "DONE" ? "Voir / modifier" : "Effectuer l'appel"} →
                            </Link>
                          ) : (
                            <Link
                              to={`/attendance/call?classId=${c.classId}`}
                              className="text-xs font-medium text-slate-500 hover:underline"
                            >
                              Voir →
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}