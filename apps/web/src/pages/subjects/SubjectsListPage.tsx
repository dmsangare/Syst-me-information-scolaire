import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Plus, Search, Eye, Power, PowerOff } from "lucide-react";
import { useSubjects } from "@/hooks/subjects";
import { useSubjectDomains } from "@/hooks/subject-domains";
import { useAuth } from "@/contexts/AuthContext";
import { subjectsApi } from "@/api/subjects";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Button,
  Input,
  Card,
  CardContent,
  PageLoader,
  EmptyState,
  StatusBadge,
} from "@/components/ui";

const TYPE_LABELS: Record<string, string> = {
  CORE: "Obligatoire",
  OPTIONAL: "Optionnelle",
  SPORT: "Sport",
  ART: "Art",
};

export function SubjectsListPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("subject:create");
  const canUpdate = hasPermission("subject:update");
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const filters = useMemo(() => ({ q: q || undefined }), [q]);
  const { data: subjects, isLoading } = useSubjects(filters);
  const { data: domains } = useSubjectDomains();
  const filtered = useMemo(() => {
    const list = Array.isArray(subjects) ? subjects : [];
    return list.filter((s) => {
      if (domainFilter && s.subjectDomainId !== domainFilter) return false;
      if (statusFilter === "active" && !s.isActive) return false;
      if (statusFilter === "inactive" && s.isActive) return false;
      return true;
    });
  }, [subjects, domainFilter, statusFilter]);
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(searchInput);
  };
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await subjectsApi.update(id, { isActive: !currentActive });
      toast.success(currentActive ? "Matiere desactivee" : "Matiere reactivee");
      qc.invalidateQueries({ queryKey: ["subjects"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erreur");
    }
  };
  if (isLoading) return <PageLoader />;
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Matieres
          </h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} matiere(s)</p>
        </div>
        {canCreate && (
          <Link to="/subjects/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle matiere
            </Button>
          </Link>
        )}
      </div>
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Rechercher par nom ou code..." className="pl-10" />
            </div>
            <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm">
              <option value="">Tous les domaines</option>
              {(domains || []).map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm">
              <option value="">Tous statuts</option>
              <option value="active">Actives</option>
              <option value="inactive">Inactives</option>
            </select>
            <Button type="submit" variant="outline">Rechercher</Button>
          </form>
        </CardContent>
      </Card>
      {filtered.length === 0 ? (
        <EmptyState title="Aucune matiere trouvee" description="Modifiez vos filtres ou creez une nouvelle matiere." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{s.name}</h3>
                    <p className="text-xs text-gray-500"># {s.code}</p>
                  </div>
                  <StatusBadge variant={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Inactive"}</StatusBadge>
                </div>
                {s.description && (<p className="text-xs text-gray-600 line-clamp-2">{s.description}</p>)}
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">{TYPE_LABELS[s.type] || s.type}</span>
                  {s._count && (<span className="text-[10px] text-gray-500">{s._count.assignments} affectation(s)</span>)}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <Link to={"/subjects/" + s.id} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full"><Eye className="h-3 w-3 mr-1" />Voir fiche</Button>
                  </Link>
                  {canUpdate && (
                    <Button variant="outline" size="sm" onClick={() => handleToggleActive(s.id, s.isActive)}>
                      {s.isActive ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
