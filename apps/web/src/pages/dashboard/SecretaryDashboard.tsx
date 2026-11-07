import { Link } from "react-router-dom";
import { UserPlus, Users, ArrowRight, FileText, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, KpiCard, PageLoader, EmptyState } from "@/components/ui";
import { useSecretaryDashboard } from "@/hooks/dashboard/useDashboard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { TechFooter } from "@/components/dashboard/TechFooter";
import { formatDate } from "@/lib/formatters";

export function SecretaryDashboard() {
  const { data, isLoading } = useSecretaryDashboard();

  if (isLoading) return <PageLoader label="Chargement du secrétariat..." />;

  return (
    <div className="min-h-screen bg-[#F3F7FD] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        
        <WelcomeBanner subtitle="Gérez les inscriptions et les dossiers élèves." />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Inscriptions du jour"
            value={data?.todayEnrollments || 0}
            hint="Nouveaux élèves"
            icon={<UserPlus className="h-5 w-5" />}
            accent="success"
          />
          <KpiCard
            label="Total élèves actifs"
            value={data?.totalStudents || 0}
            hint="Année en cours"
            icon={<Users className="h-5 w-5" />}
            accent="brand"
          />
          <KpiCard
            label="Dossiers récents"
            value={data?.recentStudents?.length || 0}
            hint="5 derniers inscrits"
            icon={<FileText className="h-5 w-5" />}
            accent="info"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-emerald-600" /> Derniers élèves inscrits
              </CardTitle>
              <Link to="/students" className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">
                Tout voir <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {!data?.recentStudents || data.recentStudents.length === 0 ? (
                <div className="p-6"><EmptyState title="Aucun élève" description="Aucun élève récemment inscrit." /></div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recentStudents.map((s: any) => (
                    <li key={s.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                      <div>
                        <p className="font-medium text-slate-800">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-slate-500">{s.matricule}</p>
                      </div>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                        {formatDate(s.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" /> Actions rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Link to="/students/new" className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all">
                <span className="text-sm font-medium text-slate-700">Inscrire un nouvel élève</span>
                <ArrowRight className="h-4 w-4 text-blue-500" />
              </Link>
              <Link to="/classes" className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all">
                <span className="text-sm font-medium text-slate-700">Gérer les classes</span>
                <ArrowRight className="h-4 w-4 text-blue-500" />
              </Link>
              <Link to="/students" className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all">
                <span className="text-sm font-medium text-slate-700">Consulter les dossiers élèves</span>
                <ArrowRight className="h-4 w-4 text-blue-500" />
              </Link>
            </CardContent>
          </Card>
        </div>

        <TechFooter />
      </div>
    </div>
  );
}