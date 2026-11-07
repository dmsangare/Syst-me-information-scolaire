import { Link } from "react-router-dom";
import { CalendarCheck, Users, AlertCircle, PhoneCall, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, KpiCard, PageLoader, EmptyState } from "@/components/ui";
import { useSupervisorDashboard } from "@/hooks/dashboard/useDashboard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { TechFooter } from "@/components/dashboard/TechFooter";

export function SupervisorDashboard() {
  const { data, isLoading } = useSupervisorDashboard();

  if (isLoading) return <PageLoader label="Chargement de la supervision..." />;

  return (
    <div className="min-h-screen bg-[#F3F7FD] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        
        <WelcomeBanner subtitle="Voici l'état des présences de l'établissement aujourd'hui." />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Sessions aujourd'hui"
            value={data?.todaySessions || 0}
            hint="Cours enregistrés"
            icon={<CalendarCheck className="h-5 w-5" />}
            accent="brand"
          />
          <KpiCard
            label="Absences du jour"
            value={data?.absentsCount || 0}
            hint="Élèves absents"
            icon={<AlertCircle className="h-5 w-5" />}
            accent="danger"
          />
          <KpiCard
            label="Taux de présence"
            value={data?.todaySessions > 0 ? "En cours" : "À venir"}
            hint="Mise à jour en direct"
            icon={<CheckCircle2 className="h-5 w-5" />}
            accent="success"
          />
        </div>

        <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Users className="h-4 w-4 text-red-500" /> Élèves absents aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!data?.absents || data.absents.length === 0 ? (
              <div className="p-6">
                <EmptyState title="Aucune absence" description="Tous les élèves sont présents." />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.absents.map((abs: any) => (
                  <li key={abs.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-3 hover:bg-slate-50/50 transition-colors">
                    <div>
                      <p className="font-medium text-slate-800">{abs.student?.firstName} {abs.student?.lastName}</p>
                      <p className="text-xs text-slate-500">
                        {abs.student?.matricule} · {abs.session?.class?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {abs.student?.guardians?.length > 0 ? (
                        <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                          <PhoneCall className="h-3 w-3" />
                          {abs.student.guardians[0].guardian?.phone || "Non renseigné"}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Aucun tuteur</span>
                      )}
                      <Link to="/presences" className="text-xs font-medium text-blue-600 hover:underline">
                        Voir le module
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <TechFooter />
      </div>
    </div>
  );
}