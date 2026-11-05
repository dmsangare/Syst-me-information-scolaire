import { useState, useMemo } from "react";
import { X, Search, UserPlus, Loader2, Check } from "lucide-react";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useCreateEnrollment } from "@/hooks/enrollments";

interface AssignStudentsModalProps {
  classId: string;
  levelId: string;
  academicYearId: string;
  enrolledStudentIds: string[];
  onClose: () => void;
}

interface Student {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate?: string;
}

export function AssignStudentsModal({
  classId,
  levelId,
  academicYearId,
  enrolledStudentIds,
  onClose,
}: AssignStudentsModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const createMutation = useCreateEnrollment();

  // Charger tous les élèves actifs de l'ecole
  const { data: allStudents, isLoading } = useQuery({
    queryKey: ["students", "list", "assign"],
    queryFn: async () => {
      const { data } = await api.get("/students", { params: { limit: 200 } });
      return (data.data || data) as Student[];
    },
    staleTime: 30_000,
  });

  // Filtrer : élèves non deja inscrits dans cette classe
  const available = useMemo(() => {
    if (!allStudents) return [];
    return allStudents.filter((s) => !enrolledStudentIds.includes(s.id));
  }, [allStudents, enrolledStudentIds]);

  // Filtre par recherche
  const filtered = useMemo(() => {
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter((s) =>
      `${s.firstName} ${s.lastName} ${s.matricule}`.toLowerCase().includes(q),
    );
  }, [available, search]);

  const toggleStudent = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map((s) => s.id)));
  const clearAll = () => setSelected(new Set());

  const handleSubmit = async () => {
    if (selected.size === 0) return;

    try {
      // Inscrire chaque élève selectionne
      for (const studentId of selected) {
        await createMutation.mutateAsync({
          studentId,
          academicYearId,
          classId,
          levelId,
          status: "VALIDATED",
        });
      }
      onClose();
    } catch {
      // erreur geree par le hook
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-sis-lg shadow-2xl relative z-[10000] max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Affecter des eleves
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Selectionnez les élèves a inscrire dans cette classe
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* BARRE DE RECHERCHE */}
        <div className="p-6 pb-3 space-y-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un élève (nom, matricule)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {filtered.length} eleve(s) disponible(s) · {selected.size} selectionne(s)
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={filtered.length === 0}
              >
                Tout selectionner
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={selected.size === 0}
              >
                Effacer
              </Button>
            </div>
          </div>
        </div>

        {/* LISTE */}
        <div className="flex-1 overflow-y-auto p-6 pt-3">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">
                {available.length === 0
                  ? "Tous les élèves sont deja inscrits dans cette classe"
                  : "Aucun élève ne correspond a la recherche"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((s) => {
                const isSelected = selected.has(s.id);
                return (
                  <label
                    key={s.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-input hover:bg-muted/50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleStudent(s.id)}
                      className="h-4 w-4 accent-primary"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold",
                          s.gender === "M"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-pink-100 text-pink-700",
                        )}
                      >
                        {s.firstName[0]}
                        {s.lastName[0]}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {s.lastName} {s.firstName}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {s.matricule}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-between items-center gap-2 px-6 py-4 border-t bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {selected.size > 0 && (
              <>
                <strong className="text-foreground">{selected.size}</strong>{" "}
                eleve(s) a affecter
              </>
            )}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={selected.size === 0 || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Affectation en cours...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Affecter {selected.size > 0 ? `(${selected.size})` : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
