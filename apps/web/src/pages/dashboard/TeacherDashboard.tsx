import { Link } from "react-router-dom";
import { 
  Calendar, BookOpen, Users, Clock, ArrowRight, ClipboardCheck, 
  GraduationCap, AlertCircle
} from "lucide-react";
import { 
  Card, CardContent, CardHeader, CardTitle, KpiCard, PageLoader, 
  EmptyState, StatusBadge 
} from "@/components/ui";
import { useTeacherDashboard } from "@/hooks/dashboard/useDashboard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { TechFooter } from "@/components/dashboard/TechFooter";
import { formatDate } from "@/lib/formatters";

export function TeacherDashboard() {
  const { data, isLoading } = useTeacherDashboard();

  if (isLoading) return <PageLoader label="Chargement de votre espace..." />;

  if (!data?.hasProfile) {
    return (
      <div className="min-h-screen bg-[#F3F7FD] p-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <EmptyState
            title="Profil enseignant introuvable"
            description="Contactez l'administration pour lier votre compte à une fiche enseignant."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F7FD] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        
        <WelcomeBanner subtitle="Voici un aperçu de votre activité pédagogique." />

        {/* KPI Enseignant */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Mes classes"
            value={data.myClasses?.length || 0}
            hint="Classes assignées"
            icon={<BookOpen className="h-5 w-5" />}
            accent="brand"
          />
          <KpiCard
            label="Mes élèves"
            value={data.totalStudents || 0}
            hint="Élèves au total"
            icon={<Users className="h-5 w-5" />}
            accent="info"
          />
          <KpiCard
            label="Évaluations à venir"
            value={data.upcomingAssessments?.length || 0}
            hint="Dans les 7 jours"
            icon={<Calendar className="h-5 w-5" />}
            accent="warning"
          />
          <KpiCard
            label="Notes à saisir"
            value={data.pendingAssessments?.length || 0}
            hint="Évaluations en attente"
            icon={<ClipboardCheck className="h-5 w-5" />}
            accent="danger"
          />
        </div>

        {/* Mes classes & Matières */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="col-span-2 rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-600" /> Mes classes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.myClasses?.length === 0 ? (
                <div className="p-6"><EmptyState title="Aucune classe" description="Vous n'avez pas encore de classe assignée." /></div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.myClasses?.map((c: any) => (
                    <li key={c.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                      <div>
                        <p className="font-medium text-slate-800">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.level?.name} · {c.studentCount} élèves</p>
                      </div>
                      <Link to="/notes" className="text-xs font-medium text-blue-600 hover:underline">Saisir notes →</Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-emerald-600" /> Mes matières
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {data.mySubjects?.length === 0 ? (
                <EmptyState title="Aucune matière" description="Vous n'enseignez aucune matière." />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.mySubjects?.map((s: any) => (
                    <span key={s.id} className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Évaluations à venir & En attente */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-500" /> Prochaines évaluations (7 jours)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.upcomingAssessments?.length === 0 ? (
                <div className="p-6"><EmptyState title="Rien de prévu" description="Aucune évaluation planifiée." /></div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.upcomingAssessments?.map((a: any) => (
                    <li key={a.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium text-slate-800">{a.title}</p>
                        <p className="text-xs text-slate-500">{a.class?.name} · {a.subject?.name}</p>
                      </div>
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{formatDate(a.date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" /> Notes à saisir
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.pendingAssessments?.length === 0 ? (
                <div className="p-6"><EmptyState title="À jour !" description="Aucune note en attente." /></div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.pendingAssessments?.map((a: any) => (
                    <li key={a.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium text-slate-800">{a.title}</p>
                        <p className="text-xs text-slate-500">{a.class?.name} · {a._count?.grades || 0} notes saisies</p>
                      </div>
                      <Link to={`/notes?assessment=${a.id}`} className="text-xs font-medium text-blue-600 hover:underline">Saisir →</Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <TechFooter />
      </div>
    </div>
  );
}