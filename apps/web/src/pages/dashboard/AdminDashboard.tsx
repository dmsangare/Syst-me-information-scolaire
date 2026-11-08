import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Users, UsersRound, School, TrendingUp, TrendingDown, Wallet, CheckCircle2, AlertCircle, Receipt, GraduationCap, ArrowRight,
} from "lucide-react";
import { reportsApi } from "@/api/reports";
import { api } from "@/lib/axios";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Card, CardContent, CardHeader, CardTitle, KpiCard, PageLoader, ErrorState, EmptyState, StatusBadge,
} from "@/components/ui";
import { SetupChecklist } from "./SetupChecklist";
import { SetupBanner } from "@/components/setup/SetupBanner";
import { ClosingYearCard } from "./ClosingYearCard";
import { AdminGenderDistribution } from "./AdminDashboard.stats";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { TechFooter } from "@/components/dashboard/TechFooter";
import { EnrollmentByClassChart } from "@/components/dashboard/EnrollmentByClassChart";
import { ClassesDistributionDonut } from "@/components/dashboard/ClassesDistributionDonut";
import { RecentActivities } from "@/components/dashboard/RecentActivities";
import { RecentReportCards } from "@/components/dashboard/RecentReportCards";
import { GradesBySubjectChart } from "@/components/dashboard/GradesBySubjectChart";

export function AdminDashboard() {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => reportsApi.dashboard(),
  });

  const { data: attendance } = useQuery({
    queryKey: ["dashboard-attendance"],
    queryFn: () => reportsApi.attendance(),
  });

  const { data: unpaid } = useQuery({
    queryKey: ["dashboard-unpaid"],
    queryFn: async () => {
      try {
        const res = await api.get("/invoices", { params: { status: "UNPAID", limit: 5 } });
        return res.data;
      } catch { return { data: [] }; }
    },
  });

  const { data: recentPayments } = useQuery({
    queryKey: ["dashboard-payments"],
    queryFn: async () => {
      try {
        const res = await api.get("/payments", { params: { limit: 5 } });
        return res.data;
      } catch { return { data: [] }; }
    },
  });

  const { data: upcomingExams } = useQuery({
    queryKey: ["dashboard-exams"],
    queryFn: async () => {
      try {
        const res = await api.get("/exams", { params: { status: "PLANNED", limit: 5 } });
        return res.data;
      } catch { return { data: [] }; }
    },
  });

  if (isLoading) return <PageLoader label="Chargement du tableau de bord..." />;
  if (error) {
    return (
      <div className="p-6">
        <ErrorState title="Impossible de charger les statistiques" description="Une erreur est survenue." onRetry={() => refetch()} />
      </div>
    );
  }

  const recoveryRate = (stats?.totalBilled ?? 0) > 0 ? ((stats?.revenueAmount ?? 0) / (stats?.totalBilled ?? 1)) * 100 : 0;
  const unpaidList = (unpaid as any)?.data ?? [];
  const paymentList = (recentPayments as any)?.data ?? [];
  const examsList = (upcomingExams as any)?.data ?? [];
  const attendanceData: any = attendance ?? {};

  return (
    <div className="min-h-screen bg-[#F3F7FD] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Bandeau assistant démarrage */}
        <SetupBanner />
        <SetupChecklist />
        <ClosingYearCard />

        {/* En-tête — bannière de bienvenue */}
        <WelcomeBanner />

        {/* KPI — Ligne 1 : population */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Élèves" value={stats?.studentsCount || 0} hint={`${stats?.genderSplit.boys || 0} garçons, ${stats?.genderSplit.girls || 0} filles`} icon={<Users className="h-5 w-5" />} accent="brand" />
          <KpiCard label="Enseignants" value={stats?.teachersCount || 0} hint="Personnel actif" icon={<UsersRound className="h-5 w-5" />} accent="info" />
          <KpiCard label="Classes" value={stats?.classesCount || 0} hint="Classes actives" icon={<School className="h-5 w-5" />} accent="neutral" />
          <KpiCard label="Taux de présence" value={`${stats?.attendanceRate || 0}%`} hint="Moyenne générale" icon={<CheckCircle2 className="h-5 w-5" />} accent="success" />
        </div>

        {/* KPI — Ligne 2 : finances */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Recettes" value={formatCurrency(stats?.revenueAmount || 0)} hint={`Sur ${formatCurrency(stats?.totalBilled || 0)} facturés`} icon={<TrendingUp className="h-5 w-5" />} accent="success" />
          <KpiCard label="Impayés" value={formatCurrency(stats?.unpaidAmount || 0)} hint="Reste à recouvrer" icon={<TrendingDown className="h-5 w-5" />} accent="danger" />
          <KpiCard label="Taux recouvrement" value={`${recoveryRate.toFixed(1)}%`} hint={recoveryRate >= 70 ? "Objectif atteint" : recoveryRate >= 40 ? "En progression" : "À améliorer"} icon={<Wallet className="h-5 w-5" />} accent={recoveryRate >= 70 ? "success" : recoveryRate >= 40 ? "warning" : "danger"} />
          <KpiCard label="Absences du jour" value={attendanceData?.todayAbsences ?? 0} hint="À traiter" icon={<AlertCircle className="h-5 w-5" />} accent="warning" />
        </div>

        {/* Ligne 3 : Graphiques modernes (Effectifs + Donut) */}
        <div className="grid gap-6 md:grid-cols-2">
          <EnrollmentByClassChart />
          <ClassesDistributionDonut />
        </div>

        {/* Ligne 3b : Répartition des notes par matière */}
        <GradesBySubjectChart />

        {/* Ligne 4 : Activités + Bulletins récents */}
        <div className="grid gap-6 md:grid-cols-2">
          <RecentActivities />
          <RecentReportCards />
        </div>

        {/* Ligne 5 : Impayés + Paiements récents */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" /> Impayés récents
              </CardTitle>
              <Link to="/invoices" className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">Tout voir <ArrowRight className="h-3 w-3" /></Link>
            </CardHeader>
            <CardContent className="p-0">
              {unpaidList.length === 0 ? (
                <div className="p-6"><EmptyState title="Aucun impayé" description="Tous les paiements sont à jour." /></div>
              ) : (
                <div className="overflow-x-auto"><table className="w-full text-sm min-w-[500px]">
                  <tbody className="divide-y divide-slate-100">
                    {unpaidList.slice(0, 5).map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <Link to={`/invoices/${inv.id}`} className="hover:underline">
                            <span className="font-mono text-xs text-slate-500">{inv.number}</span>
                            <span className="block font-medium text-slate-800 mt-0.5">{inv.student?.firstName} {inv.student?.lastName}</span>
                          </Link>
                        </td>
                        <td className="p-4 text-right">
                          <StatusBadge variant="danger" showIcon={false} className="bg-red-50 text-red-600 rounded-full border-0">{formatCurrency(inv.balance)}</StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-500" /> Paiements récents
              </CardTitle>
              <Link to="/payments" className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">Tout voir <ArrowRight className="h-3 w-3" /></Link>
            </CardHeader>
            <CardContent className="p-0">
              {paymentList.length === 0 ? (
                <div className="p-6"><EmptyState title="Aucun paiement" description="Aucun paiement enregistré." /></div>
              ) : (
                <div className="overflow-x-auto"><table className="w-full text-sm min-w-[500px]">
                  <tbody className="divide-y divide-slate-100">
                    {paymentList.slice(0, 5).map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <span className="font-medium text-slate-800">{p.student?.firstName} {p.student?.lastName}</span>
                          <span className="block text-xs text-slate-500 mt-0.5">{p.method}</span>
                        </td>
                        <td className="p-4 text-right">
                          <StatusBadge variant="success" showIcon={false} className="bg-emerald-50 text-emerald-600 rounded-full border-0">{formatCurrency(p.amount)}</StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ligne 6 : Examens + Répartition */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-blue-600" /> Examens planifiés
              </CardTitle>
              <Link to="/exams" className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">Tout voir <ArrowRight className="h-3 w-3" /></Link>
            </CardHeader>
            <CardContent className="p-0">
              {examsList.length === 0 ? (
                <div className="p-6"><EmptyState title="Aucun examen" description="Aucun examen programmé." /></div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {examsList.slice(0, 5).map((e: any) => (
                    <Link key={e.id} to={`/exams/${e.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                      <div>
                        <p className="font-medium text-slate-800">{e.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDate(e.startDate)}</p>
                      </div>
                      <StatusBadge variant="info" showIcon={false} className="bg-blue-50 text-blue-600 rounded-full border-0">{e.type}</StatusBadge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <AdminGenderDistribution boys={stats?.genderSplit.boys || 0} girls={stats?.genderSplit.girls || 0} />
        </div>

        {/* Footer technique */}
        <TechFooter />
      </div>
    </div>
  );
}