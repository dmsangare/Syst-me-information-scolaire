import { useState, useEffect, useMemo } from "react";
import { X, Loader2, Calendar, BookOpen, School, Clock } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useCreateAssessment } from "@/hooks/assessments";
import { useClasses, useLevels } from "@/hooks/classes";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { isTermAllowedForCycle } from "@/lib/grading";

const ASSESSMENT_TYPES = [
  { value: "INTERROGATION", label: "Interrogation", emoji: "❔" },
  { value: "DEVOIR", label: "Devoir", emoji: "🔵" },
  { value: "CONTROLE", label: "Controle", emoji: "🟣" },
  { value: "COMPOSITION", label: "Composition", emoji: "🟠" },
  { value: "EXAMEN", label: "Examen", emoji: "🔴" },
  { value: "TP", label: "Travaux Pratiques", emoji: "🟢" },
  { value: "ORAL", label: "Oral", emoji: "🟡" },
  { value: "PROJET", label: "Projet", emoji: "🔷" },
];

interface Props {
  onClose: () => void;
}

export function CreateAssessmentModal({ onClose }: Props) {
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [termId, setTermId] = useState("");
  const [type, setType] = useState("DEVOIR");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [maxScore, setMaxScore] = useState<number>(20);
  const [coefficient, setCoefficient] = useState<number>(1);
  const [durationMin, setDurationMin] = useState<number | "">("");

  const createMutation = useCreateAssessment();
  const { data: classes } = useClasses();
  const { data: levels } = useLevels();

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

  const { data: subjects } = useQuery({
    queryKey: ["subjects", "list"],
    queryFn: async () => {
      const { data } = await api.get("/subjects");
      return data.data || data;
    },
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (academicYears && !academicYearId) {
      const current = academicYears.find((y: any) => y.isCurrent) || academicYears[0];
      if (current) setAcademicYearId(current.id);
    }
  }, [academicYears, academicYearId]);

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

  const selectedClass = classes?.find((c) => c.id === classId);
  const selectedLevel = selectedClass
    ? levels?.find((l) => l.id === selectedClass.levelId)
    : null;
  const isFirstCycle = selectedLevel?.cycle === "PREMIER_CYCLE";

  useEffect(() => {
    if (selectedLevel) {
      setMaxScore(isFirstCycle ? 10 : 20);
    }
  }, [selectedLevel, isFirstCycle]);

  useEffect(() => {
    if (!terms || !selectedLevel) return;
    const allowed = terms.filter((t: any) => isTermAllowedForCycle(t.type, selectedLevel.cycle));
    if (allowed.length > 0 && !allowed.some((t: any) => t.id === termId)) {
      const now = new Date();
      const current = allowed.find(
        (t: any) => now >= new Date(t.startDate) && now <= new Date(t.endDate),
      );
      setTermId((current || allowed[0]).id);
    }
  }, [terms, selectedLevel, termId]);

  const sortedClasses = useMemo(() => {
    if (!classes || !levels) return [];
    return [...classes].sort((a, b) => {
      const la = levels.find((l) => l.id === a.levelId)?.orderIndex ?? 999;
      const lb = levels.find((l) => l.id === b.levelId)?.orderIndex ?? 999;
      if (la !== lb) return la - lb;
      return a.code.localeCompare(b.code);
    });
  }, [classes, levels]);

  const formValid =
    academicYearId && classId && subjectId && termId && title.trim() && date;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid || !selectedClass) return;

    // ✅ CORRECTION ICI : On bloque la création si la classe n'a pas de prof
    if (!selectedClass.mainTeacherId) {
      alert("Cette classe n'a pas de professeur principal défini. Veuillez d'abord l'assigner dans la gestion des classes.");
      return;
    }

    const input: any = {
      academicYearId,
      classId,
      subjectId,
      termId,
      teacherId: selectedClass.mainTeacherId, // ✅ Utilisation du vrai ID
      type,
      title: title.trim(),
      date,
      maxScore: Number(maxScore),
      coefficient: Number(coefficient),
    };

    if (durationMin) input.durationMin = Number(durationMin);

    try {
      await createMutation.mutateAsync(input);
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
        className="bg-background rounded-sis-lg shadow-2xl relative z-[10000] max-w-2xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-lg font-semibold">Nouvelle evaluation</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Creez un devoir, une composition ou une interrogation
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
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
                <option value="">-- Selectionner --</option>
                {academicYears?.map((y: any) => (
                  <option key={y.id} value={y.id}>
                    {y.label} {y.isCurrent ? "(en cours)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <School className="h-3.5 w-3.5" />
                  Classe
                </Label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  <option value="">-- Selectionner --</option>
                  {sortedClasses.map((c) => {
                    const level = levels?.find((l) => l.id === c.levelId);
                    const emoji = level?.cycle === "PREMIER_CYCLE" ? "📗" : "📘";
                    return (
                      <option key={c.id} value={c.id}>
                        {emoji} {c.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <Label>Période</Label>
                <select
                  value={termId}
                  onChange={(e) => setTermId(e.target.value)}
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  <option value="">-- Selectionner --</option>
                  {(terms || [])
                    .filter((t: any) => isTermAllowedForCycle(t.type, selectedLevel?.cycle))
                    .map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" />
                Matière
              </Label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">-- Selectionner --</option>
                {subjects?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="mb-2 block">Type d evaluation</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ASSESSMENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg border-2 text-xs font-medium transition-all",
                      type === t.value
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-primary/50",
                    )}
                  >
                    <span className="text-lg">{t.emoji}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Compo Octobre, Devoir n1..."
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="maxScore">
                  Bareme {selectedClass && `(${isFirstCycle ? "1er cycle" : "2eme cycle"})`}
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/</span>
                  <Input
                    id="maxScore"
                    type="number"
                    min={1}
                    max={100}
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value) || 20)}
                    required
                  />
                </div>
                {selectedClass && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Suggere : /{isFirstCycle ? "10" : "20"} pour ce cycle
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="coefficient">Coefficient</Label>
                <Input
                  id="coefficient"
                  type="number"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={coefficient}
                  onChange={(e) => setCoefficient(Number(e.target.value) || 1)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="duration" className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Duree (min)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={300}
                  value={durationMin}
                  onChange={(e) =>
                    setDurationMin(e.target.value ? Number(e.target.value) : "")
                  }
                  placeholder="Optionnel"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!formValid || createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Créer l evaluation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}