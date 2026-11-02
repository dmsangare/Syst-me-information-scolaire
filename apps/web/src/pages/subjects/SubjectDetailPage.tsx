import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, GraduationCap, Users, FileText } from "lucide-react";
import { useSubject } from "@/hooks/subjects";
import { Card, CardContent, PageLoader, StatusBadge } from "@/components/ui";

const TYPE_LABELS: Record<string, string> = { CORE: "Obligatoire", OPTIONAL: "Optionnelle", SPORT: "Sport", ART: "Art" };

export function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: subject, isLoading } = useSubject(id);
  if (isLoading) return <PageLoader />;
  if (!subject) return <div className="p-6">Matiere introuvable</div>;
  const s: any = subject;
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <Link to="/subjects" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4 mr-1" />Retour aux matieres</Link>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-blue-600" />{s.name}</h1><p className="text-sm text-gray-500 mt-1">Code : {s.code}</p></div>
        <StatusBadge variant={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Inactive"}</StatusBadge>
      </div>
      <Card><CardContent className="p-6 space-y-3">
        <h2 className="font-semibold text-lg">Informations generales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-500">Type</p><p className="font-medium">{TYPE_LABELS[s.type] || s.type}</p></div>
          <div><p className="text-gray-500">Domaine pedagogique</p><p className="font-medium">{s.subjectDomain?.name || "Non defini"}</p></div>
          <div className="md:col-span-2"><p className="text-gray-500">Description</p><p className="font-medium">{s.description || "Aucune description"}</p></div>
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-6 space-y-3">
        <h2 className="font-semibold text-lg flex items-center gap-2"><GraduationCap className="h-5 w-5 text-blue-600" />Coefficients par niveau</h2>
        {!s.coefficients || s.coefficients.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun coefficient configure.</p>
        ) : (
          <div className="space-y-2">
            {s.coefficients.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div><p className="text-sm font-medium">{c.level.name}</p>{c.academicYear && <p className="text-xs text-gray-500">{c.academicYear.label}</p>}</div>
                <div className="text-right"><p className="text-sm font-semibold">Coefficient {c.coefficient}</p>{c.weeklyHours && <p className="text-xs text-gray-500">{c.weeklyHours}h/semaine</p>}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardContent className="p-6"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-emerald-600" /><p className="text-sm text-gray-500">Affectations</p></div><p className="text-2xl font-bold mt-1">{s._count?.assignments ?? 0}</p><p className="text-xs text-gray-500">enseignant(s) affecte(s)</p></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-amber-600" /><p className="text-sm text-gray-500">Evaluations</p></div><p className="text-2xl font-bold mt-1">{s._count?.assessments ?? 0}</p><p className="text-xs text-gray-500">evaluation(s) enregistree(s)</p></CardContent></Card>
      </div>
    </div>
  );
}
