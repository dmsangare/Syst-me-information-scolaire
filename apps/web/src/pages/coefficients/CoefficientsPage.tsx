import { useMemo, useState } from "react";
import { Save, Loader2, BookOpen, AlertCircle, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  useCoefficientsForSubjects,
  useSetCoefficient,
  useRemoveCoefficient,
} from "@/hooks/subject-coefficients/useSubjectCoefficients";
import { useAcademicYears, useClasses, useLevels } from "@/hooks/classes/useClasses";
import { useClassSubjects } from "@/hooks/class-subjects/useClassSubjects";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/axios";
import type { SubjectCoefficient } from "@/types/subject-coefficient";

const CYCLE_2 = "DEUXIEME_CYCLE";

interface RowState {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  coefficient: string;
  weeklyHours: string;
  existingId: string | null;
  dirty: boolean;
}

export default function CoefficientsPage() {
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [levelId, setLevelId] = useState<string>("");
  const [draftBySubject, setDraftBySubject] = useState<Record<string, { coefficient: string; weeklyHours: string }>>({});

  const { data: years } = useAcademicYears();
  const { data: levels } = useLevels();
  const { data: classes } = useClasses();

  const currentYearId = useMemo(() => {
    if (academicYearId) return academicYearId;
    const current = years?.find((y) => y.isCurrent);
    return current?.id || years?.[0]?.id || "";
  }, [academicYearId, years]);

  // Niveaux du 2e cycle uniquement
  const cycle2Levels = useMemo(() => {
    if (!levels) return [];
    return levels.filter((l) => l.cycle === CYCLE_2);
  }, [levels]);

  const selectedLevel = useMemo(
    () => cycle2Levels.find((l) => l.id === levelId),
    [cycle2Levels, levelId],
  );

  // Classes correspondant au niveau selectionne
  const classesForLevel = useMemo(() => {
    if (!classes || !levelId) return [];
    return classes.filter((c) => c.levelId === levelId);
  }, [classes, levelId]);

  // Matieres affectees : on interroge ClassSubject pour la 1ere classe du niveau
  const classSubjectFilters = useMemo(() => {
    if (!levelId || classesForLevel.length === 0) {
      return { academicYearId: currentYearId || undefined };
    }
    return {
      classId: classesForLevel[0].id,
      academicYearId: currentYearId || undefined,
    };
  }, [levelId, classesForLevel, currentYearId]);

  const { data: classSubjects, isLoading: csLoading } = useClassSubjects(
    classSubjectFilters,
    Boolean(levelId && currentYearId && classesForLevel.length > 0),
  );

  const uniqueSubjects = useMemo(() => {
    if (!classSubjects) return [];
    const seen = new Set<string>();
    const out: Array<{ subjectId: string; subjectCode: string; subjectName: string }> = [];
    for (const cs of classSubjects) {
      if (!cs.subject || seen.has(cs.subjectId)) continue;
      seen.add(cs.subjectId);
      out.push({
        subjectId: cs.subjectId,
        subjectCode: cs.subject.code,
        subjectName: cs.subject.name,
      });
    }
    return out.sort((a, b) => a.subjectCode.localeCompare(b.subjectCode));
  }, [classSubjects]);

  const subjectIds = useMemo(() => uniqueSubjects.map((s) => s.subjectId), [uniqueSubjects]);
  const { queries, isLoading: coeffLoading } = useCoefficientsForSubjects(
    subjectIds,
    Boolean(levelId && currentYearId && subjectIds.length > 0),
  );

  // Map subjectId -> coefficient existant (pour le niveau + annee courante)
  const existingBySubject = useMemo(() => {
    const map = new Map<string, SubjectCoefficient>();
    subjectIds.forEach((sid, idx) => {
      const q = queries[idx];
      const list = q?.data || [];
      const match = list.find(
        (c) => c.levelId === levelId && c.academicYearId === currentYearId,
      );
      if (match) map.set(sid, match);
    });
    return map;
  }, [subjectIds, queries, levelId, currentYearId]);

  // Construction des lignes avec draft
  const rows: RowState[] = useMemo(() => {
    return uniqueSubjects.map((s) => {
      const existing = existingBySubject.get(s.subjectId);
      const draft = draftBySubject[s.subjectId];
      const coefficient = draft
        ? draft.coefficient
        : existing
        ? String(existing.coefficient)
        : "";
      const weeklyHours = draft
        ? draft.weeklyHours
        : existing && existing.weeklyHours !== null
        ? String(existing.weeklyHours)
        : "";
      return {
        subjectId: s.subjectId,
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        coefficient,
        weeklyHours,
        existingId: existing?.id || null,
        dirty: Boolean(draft),
      };
    });
  }, [uniqueSubjects, existingBySubject, draftBySubject]);

  const dirtyCount = rows.filter((r) => r.dirty).length;
  const filledCount = rows.filter((r) => r.coefficient !== "").length;

  const setCoeffMut = useSetCoefficient();
  const removeCoeffMut = useRemoveCoefficient();

  const handleChange = (subjectId: string, field: "coefficient" | "weeklyHours", value: string) => {
    setDraftBySubject((prev) => {
      const current = prev[subjectId] || { coefficient: "", weeklyHours: "" };
      return {
        ...prev,
        [subjectId]: { ...current, [field]: value },
      };
    });
  };

  const handleSaveAll = async () => {
    const toSave = rows.filter((r) => r.dirty && r.coefficient !== "");
    if (toSave.length === 0) {
      toast.info("Aucune modification a enregistrer");
      return;
    }

    let success = 0;
    let failed = 0;

    for (const row of toSave) {
      const coeff = parseFloat(row.coefficient.replace(",", "."));
      if (isNaN(coeff) || coeff <= 0) {
        toast.error("Coefficient invalide pour " + row.subjectCode);
        failed++;
        continue;
      }
      const hours = row.weeklyHours.trim() === "" ? undefined : parseFloat(row.weeklyHours.replace(",", "."));
      try {
        await setCoeffMut.mutateAsync({
          subjectId: row.subjectId,
          input: {
            levelId,
            academicYearId: currentYearId,
            coefficient: coeff,
            weeklyHours: hours,
          },
        });
        success++;
      } catch {
        failed++;
      }
    }

    if (success > 0) toast.success(success + " coefficient(s) enregistre(s)");
    if (failed > 0) toast.error(failed + " echec(s)");
    setDraftBySubject({});
  };

  const handleDelete = async (subjectId: string, subjectCode: string) => {
    if (!confirm("Supprimer le coefficient de " + subjectCode + " pour ce niveau et cette annee ?")) return;
    try {
      await removeCoeffMut.mutateAsync({ subjectId, levelId, academicYearId: currentYearId });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const isFirstCycle = selectedLevel && selectedLevel.cycle !== CYCLE_2;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Coefficients par matiere</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Definir le poids de chaque matiere dans la moyenne (2e cycle uniquement)
          </p>
        </div>
        <Button
          onClick={handleSaveAll}
          disabled={dirtyCount === 0 || setCoeffMut.isPending}
          isLoading={setCoeffMut.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          Enregistrer {dirtyCount > 0 ? "(" + dirtyCount + ")" : ""}
        </Button>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card rounded-lg border">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Annee scolaire</label>
          <Select value={currentYearId} onValueChange={setAcademicYearId}>
            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
            <SelectContent>
              {years?.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.label}{y.isCurrent ? " (courante)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Niveau (2e cycle)</label>
          <Select value={levelId} onValueChange={setLevelId}>
            <SelectTrigger><SelectValue placeholder="Choisir un niveau..." /></SelectTrigger>
            <SelectContent>
              {cycle2Levels.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <div className="text-xs text-muted-foreground">
            {selectedLevel ? "Niveau : " + selectedLevel.name : "Selectionnez un niveau"}
          </div>
        </div>
      </div>

      {/* Garde-fou 1er cycle (ne peut pas arriver via dropdown, mais securite) */}
      {isFirstCycle && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-900">Premier cycle</div>
            <p className="text-sm text-amber-800 mt-1">
              Les coefficients ne s'appliquent qu'au 2e cycle (7eme, 8eme, 9eme annee).
            </p>
          </div>
        </div>
      )}

      {/* Info : pas d'historique affiche */}
      {levelId && !isFirstCycle && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            L'historique des modifications sera disponible dans une prochaine version.
            Chaque enregistrement met a jour la valeur si elle existe deja.
          </p>
        </div>
      )}

      {/* Tableau */}
      {!levelId && (
        <div className="p-12 text-center bg-card rounded-lg border">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Selectionnez un niveau</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Choisissez une annee scolaire et un niveau du 2e cycle pour saisir les coefficients.
          </p>
        </div>
      )}

      {levelId && !isFirstCycle && (csLoading || coeffLoading) && (
        <div className="p-12 text-center bg-card rounded-lg border">
          <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
          <p className="text-sm text-muted-foreground mt-2">Chargement des matieres...</p>
        </div>
      )}

      {levelId && !isFirstCycle && !csLoading && !coeffLoading && uniqueSubjects.length === 0 && (
        <div className="p-12 text-center bg-card rounded-lg border">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Aucune matiere pour ce niveau</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Affectez d'abord des matieres a une classe de ce niveau dans "Affectation matieres".
          </p>
        </div>
      )}

      {levelId && !isFirstCycle && !csLoading && !coeffLoading && uniqueSubjects.length > 0 && (
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <strong className="text-foreground">{filledCount}</strong> / {rows.length} matiere(s) avec coefficient
            </div>
            {dirtyCount > 0 && (
              <div className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded">
                {dirtyCount} modification(s) non enregistree(s)
              </div>
            )}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Matiere</th>
                <th className="px-4 py-3 font-semibold w-24">Code</th>
                <th className="px-4 py-3 font-semibold w-32">Coefficient *</th>
                <th className="px-4 py-3 font-semibold w-32">Heures/sem.</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.subjectId}
                  className={
                    "border-b last:border-b-0 " +
                    (row.dirty ? "bg-amber-50/50" : "hover:bg-muted/30")
                  }
                >
                  <td className="px-4 py-3 font-medium text-foreground">{row.subjectName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.subjectCode}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={row.coefficient}
                      onChange={(e) => handleChange(row.subjectId, "coefficient", e.target.value)}
                      placeholder="-"
                      className="w-20 h-9 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={row.weeklyHours}
                      onChange={(e) => handleChange(row.subjectId, "weeklyHours", e.target.value)}
                      placeholder="optionnel"
                      className="w-20 h-9 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.existingId && (
                      <button
                        onClick={() => handleDelete(row.subjectId, row.subjectCode)}
                        className="p-1 rounded hover:bg-red-50 text-red-600"
                        title="Supprimer le coefficient"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-muted/30 border-t text-xs text-muted-foreground">
            * Champ obligatoire pour enregistrer. Decimales acceptees (ex: 2.5, 3.75).
          </div>
        </div>
      )}
    </div>
  );
}
