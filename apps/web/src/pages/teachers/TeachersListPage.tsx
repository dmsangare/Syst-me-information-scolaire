import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Users, Plus, Search, Loader2, Mail, Phone, GraduationCap, BookOpen } from "lucide-react";
import { useTeachers } from "@/hooks/teachers";
import { initials } from "@/lib/formatters";
import { Button, Input, Card, CardContent, Avatar, AvatarFallback } from "@/components/ui";

export function TeachersListPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [teacherType, setTeacherType] = useState<"" | "GENERALIST" | "SPECIALIST">("");

  const filters = useMemo(
    () => ({
      page,
      limit: 20,
      q: q || undefined,
      teacherType: teacherType || undefined,
    }),
    [page, q, teacherType]
  );

  const { data, isLoading } = useTeachers(filters);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(searchInput);
    setPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Enseignants
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.meta.total || 0} enseignant(s)
          </p>
        </div>
        <Button asChild>
          <Link to="/teachers/new">
            <Plus className="h-4 w-4" />
            Nouvel enseignant
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, matricule, specialite..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="border rounded px-3 py-2 text-sm"
              value={teacherType}
              onChange={(e) => {
                setTeacherType(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="">Tous les profils</option>
              <option value="GENERALIST">Generalistes (1er cycle)</option>
              <option value="SPECIALIST">Specialistes (2e cycle)</option>
            </select>
            <Button type="submit" variant="secondary">
              Rechercher
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="flex flex-col h-64 items-center justify-center gap-3">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Aucun enseignant trouve</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr className="text-left text-xs font-medium text-muted-foreground uppercase">
                    <th className="px-4 py-3">Enseignant</th>
                    <th className="px-4 py-3">Matricule</th>
                    <th className="px-4 py-3">Profil</th>
                    <th className="px-4 py-3">Specialites</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Classes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((teacher) => {
                    const t = teacher as any;
                    const isGeneralist = t.teacherType === "GENERALIST";
                    const specialtiesList: string[] = (t.specialties || []).map((s: any) => s.subject?.code || s.subject?.name);
                    return (
                      <tr key={t.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {initials(t.firstName, t.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <Link
                                to={`/teachers/${t.id}`}
                                className="text-sm font-medium hover:underline"
                              >
                                {t.lastName} {t.firstName}
                              </Link>
                              <p className="text-xs text-muted-foreground">{t.email || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                          {t.matricule}
                        </td>
                        <td className="px-4 py-3">
                          <span className={"px-2 py-0.5 text-xs rounded " + (isGeneralist ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700")}>
                            {isGeneralist ? "Generaliste" : "Specialiste"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {specialtiesList.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {specialtiesList.slice(0, 3).map((s, i) => (
                                <span key={i} className="px-1.5 py-0.5 text-xs bg-muted rounded">{s}</span>
                              ))}
                              {specialtiesList.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{specialtiesList.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {t.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {t.phone}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {(t.assignments || []).length}
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