import { useState, useEffect, useMemo } from "react";
import {
  X,
  Loader2,
  FileText,
  Calendar,
  School,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useGenerateReportCards } from "@/hooks/report-cards";
import { useClasses, useLevels } from "@/hooks/classes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isTermAllowedForCycle } from "@/lib/grading";
import { api } from "@/lib/axios";

interface Props {
  onClose: () => void;
}

export function GenerateReportCardsModal({ onClose }: Props) {
  const [academicYearId, setAcademicYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [scope, setScope] = useState<"all" | "class">("all");
  const [classId, setClassId] = useState("");
  const [regenerate, setRegenerate] = useState(false);

  const generateMutation = useGenerateReportCards();
  const { data: classes } = useClasses();
  const { data: levels } = useLevels();
  const queryClient = useQueryClient();
  const [creatingMonths, setCreatingMonths] = useState(false);

  const { data: academicYears } = useQuery({
    queryKey: ["academic-years", "list"],
    queryFn: async () => {
      const { data } = await api.get("/academic-years");
      return data.data || data;
    },
    staleTime: 10 * 60_000,
  });

  const { data: terms } = useQuery({
    queryKey: ["terms", "list"],
    queryFn: async () => {
      const { data } = await api.get("/terms");
      return data.data || data;
    },
    staleTime: 10 * 60_000,
  });

  // Année courante
  useEffect(() => {
    if (academicYears && !academicYearId) {
      const current = academicYears.find((y: any) => y.isCurrent) || academicYears[0];
      if (current) setAcademicYearId(current.id);
    }
  }, [academicYears, academicYearId]);

  // Trimestre courant
  useEffect(() => {
    if (terms && !termId) {
      const now = new Date();
      const currentTerm = terms.find((t: any) => {
        const start = new Date(t.startDate);
        const end = new Date(t.endDate);
        return now >= start && now <= end;
      });
      setTermId(currentTerm?.id || terms[0]?.id || "");
    }
  }, [terms, termId]);

  // Classes triees
  const sortedClasses = useMemo(() => {
    if (!classes || !levels) return [];
    return [...classes].sort((a, b) => {
      const la = levels.find((l) => l.id === a.levelId)?.orderIndex ?? 999;
      const lb = levels.find((l) => l.id === b.levelId)?.orderIndex ?? 999;
      if (la !== lb) return la - lb;
      return a.code.localeCompare(b.code);
    });
  }, [classes, levels]);

  // Regles par cycle : le 1er cycle se calcule par mois, le 2eme cycle par trimestre
  const selectedClassCycle = useMemo(() => {
    if (scope !== "class" || !classId) return null;
    const cls = classes?.find((c) => c.id === classId);
    return levels?.find((l) => l.id === cls?.levelId)?.cycle ?? null;
  }, [scope, classId, classes, levels]);

  const visibleTerms = useMemo(
    () => (terms || []).filter((t: any) => isTermAllowedForCycle(t.type, selectedClassCycle)),
    [terms, selectedClassCycle],
  );

  useEffect(() => {
    if (visibleTerms.length > 0 && !visibleTerms.some((t: any) => t.id === termId)) {
      const now = new Date();
      const current = visibleTerms.find(
        (t: any) => now >= new Date(t.startDate) && now <= new Date(t.endDate),
      );
      setTermId((current || visibleTerms[0]).id);
    }
  }, [visibleTerms, termId]);

  const monthlyExists = (terms || []).some(
    (t: any) => t.type === "MOIS" && t.academicYearId === academicYearId,
  );

  const handleCreateMonthly = async () => {
    if (!academicYearId) return;
    setCreatingMonths(true);
    try {
      const { data } = await api.post("/terms/generate-monthly", { academicYearId });
      const res = data.data || data;
      toast.success(`${res.created} période(s) mensuelle(s) créée(s)`);
      await queryClient.invalidateQueries({ queryKey: ["terms"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Impossible de créer les périodes mensuelles");
    } finally {
      setCreatingMonths(false);
    }
  };

  const formValid =
    academicYearId && termId && (scope === "all" || (scope === "class" && classId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;

    const input: any = {
      academicYearId,
      termId,
    };

    if (scope === "class") {
      input.classId = classId;
    }

    try {
      await generateMutation.mutateAsync(input);
      onClose();
    } catch {
      // erreur geree par le hook
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-sis-lg shadow-2xl relative z-[10000] max-w-lg w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* HEADER */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Générer les bulletins</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Crée les bulletins Ã  partir des notes saisies
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={generateMutation.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* CORPS */}
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* ANNEE SCOLAIRE */}
            <div>
              <Label className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Année scolaire
              </Label>
              <select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">-- Sélectionner --</option>
                {academicYears?.map((y: any) => (
                  <option key={y.id} value={y.id}>
                    {y.label} {y.isCurrent ? "(en cours)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* TRIMESTRE */}
            <div>
              <Label>Période (mois ou trimestre)</Label>
              <select
                value={termId}
                onChange={(e) => setTermId(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">-- Sélectionner --</option>
                {visibleTerms.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.type === "MOIS" ? " (mensuelle)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* REGLES PAR CYCLE */}
            <div className="text-xs rounded border bg-muted/40 p-2.5 space-y-1.5">
              <div>
                <strong>1er cycle</strong> (1ère â†’ 6ème) : notes sur <strong>10</strong>, composition{" "}
                <strong>mensuelle</strong>.
              </div>
              <div>
                <strong>2ème cycle</strong> (7ème â†’ 9ème, DEF) : notes sur <strong>20</strong> avec{" "}
                <strong>coefficients</strong>, composition <strong>trimestrielle</strong>.
              </div>
              {!monthlyExists && academicYearId && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCreateMonthly}
                  disabled={creatingMonths}
                >
                  {creatingMonths ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Créer les périodes mensuelles de l'année
                </Button>
              )}
            </div>

            {/* PORTEE */}
            <div>
              <Label className="mb-2 block">Portée</Label>
              <div className="space-y-2">
                <label
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                    scope === "all"
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/50",
                  )}
                >
                  <input
                    type="radio"
                    checked={scope === "all"}
                    onChange={() => setScope("all")}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <div>
                    <div className="font-medium text-sm">Toutes les classes</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Génère les bulletins pour tous les élèves inscrits
                    </div>
                  </div>
                </label>

                <label
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                    scope === "class"
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/50",
                  )}
                >
                  <input
                    type="radio"
                    checked={scope === "class"}
                    onChange={() => setScope("class")}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Une classe spécifique</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Génère uniquement pour les élèves d'une classe
                    </div>
                    {scope === "class" && (
                      <select
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        className="mt-2 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                        required
                      >
                        <option value="">-- Choisir --</option>
                        {sortedClasses.map((c) => {
                          const level = levels?.find((l) => l.id === c.levelId);
                          const emoji = level?.cycle === "PREMIER_CYCLE" ? "1er" : "2e";
                          return (
                            <option key={c.id} value={c.id}>
                              {emoji} {c.name}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* INFO */}
            <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded p-2.5">
              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div>
                <strong>Calcul automatique :</strong> moyennes par matière
                (pondérées par coef), moyenne générale, rangs.
                <br />
                Seules les <strong>évaluations validées/verrouillées</strong> sont
                prises en compte.
              </div>
            </div>

            {/* AVERTISSEMENT */}
            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded p-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div>
                Si des bulletins existent déjÃ  pour cette période, ils seront
                <strong> régénérés</strong> (les décisions/appréciations saisies
                seront conservées).
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={generateMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!formValid || generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer les bulletins
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
