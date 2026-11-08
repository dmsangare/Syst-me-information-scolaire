import { Link, useParams } from "react-router-dom";
import { ArrowLeft, User, AlertCircle, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, KpiCard, PageLoader, EmptyState } from "@/components/ui";
import {
  useStudentAttendanceSummary,
  useStudentAttendanceHistory,
} from "@/hooks/attendance/useDailyAttendance";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PRESENT: { label: "Présent", color: "text-emerald-600 bg-emerald-50" },
  ABSENT: { label: "Absent", color: "text-red-600 bg-red-50" },
  ABSENT_JUSTIFIED: { label: "Absent justifié", color: "text-amber-600 bg-amber-50" },
  ABSENT_UNJUSTIFIED: { label: "Absent non justifié", color: "text-red-700 bg-red-100" },
  LATE: { label: "Retard", color: "text-amber-600 bg-amber-50" },
};

export function AttendanceStudentPage() {
  const { id } = useParams<{ id: string }>();
  const { data: summary, isLoading: summaryLoading } = useStudentAttendanceSummary(id ?? null);
  const { data: historyData, isLoading: historyLoading } = useStudentAttendanceHistory(id ?? null);

  if (summaryLoading || historyLoading) return <PageLoader label="Chargement..." />;

  if (!summary?.student) {
    return (
      <div className="p-6">
        <EmptyState title="Élève introuvable" description="Cet élève n'existe pas ou n'est pas dans votre école." />
      </div>
    );
  }

  const stats = summary.stats;
  const history = historyData?.history ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/attendance" className="text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {summary.student.lastName} {summary.student.firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {summary.student.matricule} · {summary.academicYear.label}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total jours" value={stats.totalDays} hint="Appels enregistrés" icon={<User className="h-5 w-5" />} accent="brand" />
        <KpiCard label="Absences" value={stats.absentDays} hint={`${stats.justifiedDays} justifiées, ${stats.unjustifiedDays} non justifiées`} icon={<XCircle className="h-5 w-5" />} accent="danger" />
        <KpiCard label="Retards" value={stats.lateDays} hint="Retards enregistrés" icon={<Clock className="h-5 w-5" />} accent="warning" />
        <KpiCard label="Taux présence" value={`${stats.rate}%`} hint={`${stats.presentDays} jours présents`} icon={<TrendingUp className="h-5 w-5" />} accent="success" />
      </div>

      <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600" /> Historique détaillé
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Aucun historique" description="Aucune absence enregistrée pour cet élève." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="border-b bg-slate-50">
                  <tr className="text-left text-xs font-medium text-slate-500 uppercase">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Classe</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Motif</th>
                    <th className="px-4 py-3">Justifié par</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((h) => {
                    const st = STATUS_LABELS[h.status] ?? { label: h.status, color: "text-slate-600 bg-slate-50" };
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">{new Date(h.date).toLocaleDateString("fr-FR")}</td>
                        <td className="px-4 py-3">{h.className ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{h.justificationReason ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{h.justifiedBy ?? "—"}</td>
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
