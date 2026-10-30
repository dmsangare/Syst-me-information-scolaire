import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Loader2,
  Lock,
  CheckCircle2,
  Send,
  FileText,
  Clock,
  Calendar,
  Unlock,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAssessment, useUpdateAssessmentStatus } from "@/hooks/assessments";
import { useAssessmentGrades, useBulkSaveGrades } from "@/hooks/grades";
import { GradesGrid } from "./components/GradesGrid";
import { GradesStats } from "./components/GradesStats";
import { GradesDistribution } from "./components/GradesDistribution";
import { ExportAssessmentMenu } from "./components/ExportAssessmentMenu";

const TYPE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  INTERROGATION: { label: "Interrogation", emoji: "⚪", color: "bg-gray-500/10 text-gray-700" },
  DEVOIR: { label: "Devoir", emoji: "🔵", color: "bg-blue-500/10 text-blue-700" },
  CONTROLE: { label: "Controle", emoji: "🟣", color: "bg-purple-500/10 text-purple-700" },
  COMPOSITION: { label: "Composition", emoji: "🟠", color: "bg-orange-500/10 text-orange-700" },
  EXAMEN: { label: "Examen", emoji: "🔴", color: "bg-red-500/10 text-red-700" },
  TP: { label: "TP", emoji: "🟢", color: "bg-green-500/10 text-green-700" },
  ORAL: { label: "Oral", emoji: "🟡", color: "bg-yellow-500/10 text-yellow-700" },
  PROJET: { label: "Projet", emoji: "🔷", color: "bg-cyan-500/10 text-cyan-700" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-gray-500/10 text-gray-700" },
  OPEN: { label: "Ouverte", color: "bg-blue-500/10 text-blue-700" },
  SUBMITTED: { label: "Soumise", color: "bg-orange-500/10 text-orange-700" },
  VALIDATED: { label: "Validee", color: "bg-green-500/10 text-green-700" },
  LOCKED: { label: "Verrouillee", color: "bg-purple-500/10 text-purple-700" },
};

export function AssessmentGradesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: assessment, isLoading: loadingA } = useAssessment(id);
  const { data: gradesData, isLoading: loadingG } = useAssessmentGrades(id);
  const saveGrades = useBulkSaveGrades();
  const updateStatus = useUpdateAssessmentStatus();

  const [values, setValues] = useState<Record<string, string>>({});
  const [absences, setAbsences] = useState<Record<string, boolean>>({});
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Charger les notes existantes
  useEffect(() => {
    if (gradesData?.grades) {
      const initValues: Record<string, string> = {};
      const initAbsences: Record<string, boolean> = {};
      const initObs: Record<string, string> = {};

      gradesData.grades.forEach((g: any) => {
        initValues[g.studentId] =
          g.grade?.value !== null && g.grade?.value !== undefined
            ? String(g.grade.value)
            : "";
        initAbsences[g.studentId] = g.grade?.isAbsent || false;
        initObs[g.studentId] = g.grade?.observation || "";
      });

      setValues(initValues);
      setAbsences(initAbsences);
      setObservations(initObs);
      setHasChanges(false);
    }
  }, [gradesData]);

  // ✅ PROTECTION 1 : Avertir avant de fermer l'onglet ou de recharger la page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const students = gradesData?.grades || [];
  const maxScore = Number(assessment?.maxScore) || 20;
  const isEditable =
    assessment?.status === "OPEN" || assessment?.status === "DRAFT";
  const isLocked =
    assessment?.status === "LOCKED" || assessment?.status === "VALIDATED";

  // Calcul du récapitulatif
  const totalStudents = students.length;
  const gradesSaisies = Object.values(values).filter(v => v !== "").length;
  const gradesManquantes = totalStudents - gradesSaisies;
  const hasMissingGrades = gradesManquantes > 0;

  // Handlers
  const handleChangeValue = (studentId: string, value: string) => {
    setValues((prev) => ({ ...prev, [studentId]: value }));
    setHasChanges(true);
  };

  const handleToggleAbsent = (studentId: string) => {
    setAbsences((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
    setHasChanges(true);
  };

  const handleChangeObservation = (studentId: string, value: string) => {
    setObservations((prev) => ({ ...prev, [studentId]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!id || !students.length) return;

    const grades = students.map((s: any) => ({
      studentId: s.studentId,
      value:
        absences[s.studentId] || values[s.studentId] === ""
          ? null
          : Number(values[s.studentId]),
      isAbsent: absences[s.studentId] || false,
      observation: observations[s.studentId] || undefined,
    }));

    try {
      await saveGrades.mutateAsync({ assessmentId: id, grades });
      setHasChanges(false);
    } catch {
      // erreur geree par le hook
    }
  };

  const handleStatusChange = async (
    action: "open" | "submit" | "validate" | "lock" | "reopen",
  ) => {
    if (!id) return;
    
    if (action === "submit" && hasMissingGrades) {
      alert(`Attention : Il manque ${gradesManquantes} note(s). Veuillez tout saisir avant de soumettre.`);
      return;
    }
    
    await updateStatus.mutateAsync({ id, action });
  };

  // ✅ PROTECTION 2 : Avertir avant de cliquer sur "Retour aux évaluations"
  const handleBackClick = (e: React.MouseEvent) => {
    if (hasChanges) {
      e.preventDefault();
      if (window.confirm("Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter sans enregistrer ?")) {
        navigate("/assessments");
      }
    }
  };

  // Calculer les rangs
  const ranks = useMemo(() => {
    const scored: { studentId: string; value: number }[] = [];
    students.forEach((s: any) => {
      const v = parseFloat(values[s.studentId]);
      if (!isNaN(v) && !absences[s.studentId]) {
        scored.push({ studentId: s.studentId, value: v });
      }
    });

    scored.sort((a, b) => b.value - a.value);

    const ranksMap: Record<string, number> = {};
    let currentRank = 1;
    for (let i = 0; i < scored.length; i++) {
      if (i > 0 && scored[i].value < scored[i - 1].value) {
        currentRank = i + 1;
      }
      ranksMap[scored[i].studentId] = currentRank;
    }

    return ranksMap;
  }, [students, values, absences]);

  // Loading
  if (loadingA || loadingG) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!assessment || !gradesData) {
    return (
      <div className="flex flex-col h-96 items-center justify-center gap-4">
        <FileText className="h-12 w-12 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold">Impossible de charger l'évaluation</h2>
        <p className="text-muted-foreground">L'évaluation n'existe pas ou une erreur réseau est survenue.</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Réessayer
        </Button>
        <Link to="/assessments" className="text-sm text-primary hover:underline">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const typeInfo = TYPE_LABELS[assessment.type] || TYPE_LABELS.DEVOIR;
  const statusInfo = STATUS_LABELS[assessment.status] || STATUS_LABELS.DRAFT;

  return (
    <div className="p-6 space-y-5">
      {/* ✅ BANNIÈRE D'AVERTISSEMENT */}
      {hasChanges && (
        <div className="flex items-center gap-2 px-4 py-2 bg-sis-warning-bg border border-sis-warning-border rounded-lg text-sm text-sis-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Vous avez des modifications non enregistrées. Pensez à cliquer sur "Enregistrer".</span>
        </div>
      )}

      {/* HEADER */}
      <div>
        <Link
          to="/assessments"
          onClick={handleBackClick}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux evaluations
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={cn("text-2xl shrink-0")}>{typeInfo.emoji}</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {assessment.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                {assessment.class && (
                  <span className="font-medium text-foreground">
                    {assessment.class.name}
                  </span>
                )}
                {assessment.subject && <span>· {assessment.subject.name}</span>}
                {assessment.term && <span>· {assessment.term.name}</span>}
                <span>· /{maxScore} · Coef {assessment.coefficient}</span>
                {assessment.date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(assessment.date).toLocaleDateString("fr-FR")}
                  </span>
                )}
                {assessment.durationMin && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {assessment.durationMin} min
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-block px-2.5 py-1 rounded text-xs font-medium",
                statusInfo.color,
              )}
            >
              {statusInfo.label}
            </span>
            <ExportAssessmentMenu
              assessmentId={assessment.id}
              assessmentTitle={assessment.title}
            />
          </div>
        </div>
      </div>

      {/* STATS */}
      <GradesStats
        values={values}
        maxScore={maxScore}
        totalStudents={students.length}
      />

      {/* DISTRIBUTION */}
      {students.length > 0 && (
        <GradesDistribution values={values} maxScore={maxScore} />
      )}

      {/* GRILLE */}
      <Card>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun élève inscrit dans cette classe</p>
              <p className="text-sm mt-1">
                Ajoutez des élèves a la classe avant de saisir les notes
              </p>
            </div>
          ) : (
            <GradesGrid
              students={students}
              values={values}
              absences={absences}
              observations={observations}
              ranks={ranks}
              maxScore={maxScore}
              disabled={!isEditable}
              onChangeValue={handleChangeValue}
              onToggleAbsent={handleToggleAbsent}
              onChangeObservation={handleChangeObservation}
            />
          )}
        </CardContent>
      </Card>

      {/* FOOTER — Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 sticky bottom-4 bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          {hasChanges && (
            <span className="text-orange-600 dark:text-orange-400 font-medium">
              ● Modifications non enregistrees
            </span>
          )}
          {!hasChanges && isEditable && (
            <span className="text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 inline mr-1" />
              A jour
            </span>
          )}
          {isLocked && (
            <span className="text-purple-600 dark:text-purple-400">
              <Lock className="h-4 w-4 inline mr-1" />
              Verrouillee — modification impossible
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {assessment.status === "DRAFT" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("open")}
              disabled={updateStatus.isPending}
            >
              Ouvrir la saisie
            </Button>
          )}

          {isEditable && students.length > 0 && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || saveGrades.isPending}
            >
              {saveGrades.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
          )}

          {assessment.status === "OPEN" && (
            <div className="flex items-center gap-3">
              <div className="text-xs text-right hidden sm:block">
                <div className="text-muted-foreground">{totalStudents} élèves</div>
                <div className="font-medium text-green-600">{gradesSaisies} notes saisies</div>
                {hasMissingGrades && (
                  <div className="text-orange-600 font-semibold flex items-center justify-end gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {gradesManquantes} manquantes
                  </div>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("submit")}
                disabled={updateStatus.isPending || hasChanges || hasMissingGrades}
                title={hasMissingGrades ? "Toutes les notes doivent être saisies" : ""}
              >
                <Send className="h-4 w-4 mr-2" />
                Soumettre
              </Button>
            </div>
          )}

          {assessment.status === "SUBMITTED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("validate")}
              disabled={updateStatus.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Valider
            </Button>
          )}

          {assessment.status === "VALIDATED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("lock")}
              disabled={updateStatus.isPending}
            >
              <Lock className="h-4 w-4 mr-2" />
              Verrouiller
            </Button>
          )}

          {(assessment.status === "LOCKED" ||
            assessment.status === "VALIDATED" ||
            assessment.status === "SUBMITTED") && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (
                  window.confirm(
                    "Reouvrir la saisie ? Les notes redeviendront modifiables.",
                  )
                ) {
                  handleStatusChange("reopen");
                }
              }}
              disabled={updateStatus.isPending}
            >
              <Unlock className="h-4 w-4 mr-2" />
              Reouvrir la saisie
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}