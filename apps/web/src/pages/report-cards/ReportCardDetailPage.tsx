import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Save,
  CheckCircle2,
  Send,
  User,
  Calendar,
  Award,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  useReportCard,
  useUpdateReportCard,
  useValidateReportCard,
  usePublishReportCard,
  useClearAbsences,
  useRegenerateReportCard,
} from "@/hooks/report-cards";
import {
  STATUS_LABELS,
  getAppreciation,
  getAppreciationColor,
} from "@/types/report-cards";
import type { ReportDecision } from "@/types/report-cards";
import { DecisionEditor } from "./components/DecisionEditor";
import { AppreciationEditor } from "./components/AppreciationEditor";
import { ExportReportCardButton } from "./components/ExportReportCardButton";
import { AttendanceSummaryCard } from "./components/AttendanceSummaryCard";

export function ReportCardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: report, isLoading } = useReportCard(id);
  const updateMutation = useUpdateReportCard();
  const validateMutation = useValidateReportCard();
  const publishMutation = usePublishReportCard();
  const clearAbsencesMutation = useClearAbsences();
  const regenerateMutation = useRegenerateReportCard();

  const [decision, setDecision] = useState<ReportDecision>("A_DETERMINER");
  const [appreciation, setAppreciation] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearMotive, setClearMotive] = useState("");

  useEffect(() => {
    if (report) {
      setDecision(report.decision || "A_DETERMINER");
      setAppreciation(report.appreciation || "");
      setHasChanges(false);
    }
  }, [report]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-medium">Bulletin introuvable</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/report-cards">Retour aux bulletins</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS.DRAFT;
  const isEditable = report.status === "DRAFT";
  const canValidate = report.status === "DRAFT";
  const canPublish = report.status === "VALIDATED";
  const isPublished = report.status === "PUBLISHED";

  const avg = report.average !== null ? Number(report.average) : null;
  const scale = report.scale ?? 20;
  const autoAppr = getAppreciation(avg, scale);
  const apprColor = getAppreciationColor(avg, scale);

  // DEC-6 : détection du blocage par absence
  const isBlockedByAbsence = !report.isComplete && report.decision === "A_DETERMINER";

  const handleSave = async () => {
    if (!id) return;
    await updateMutation.mutateAsync({
      id,
      input: {
        decision,
        appreciation: appreciation || undefined,
      },
    });
    setHasChanges(false);
  };

  const handleValidate = async () => {
    if (!id) return;
    if (hasChanges) {
      await handleSave();
    }
    await validateMutation.mutateAsync(id);
  };

  const handlePublish = async () => {
    if (!id) return;
    await publishMutation.mutateAsync(id);
  };

  const fullName = report.student
    ? `${report.student.lastName} ${report.student.firstName}`
    : "—";

  const items = (report.items || []).slice().sort((a, b) => {
    return Number(b.coefficient) - Number(a.coefficient);
  });

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* HEADER */}
      <div>
        <Link
          to="/report-cards"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux bulletins
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {report.student?.gender && (
              <div
                className={cn(
                  "h-14 w-14 rounded-lg flex items-center justify-center text-lg font-bold shrink-0",
                  report.student.gender === "M"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-pink-100 text-pink-700",
                )}
              >
                {report.student.firstName[0]}
                {report.student.lastName[0]}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                {report.student?.matricule && (
                  <span className="font-mono">{report.student.matricule}</span>
                )}
                {report.class && <span>· {report.class.name}</span>}
                {report.term && <span>· {report.term.name}</span>}
                {report.academicYear && <span>· {report.academicYear.label}</span>}
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
            <ExportReportCardButton
              reportCardId={report.id}
              studentName={`${report.student?.lastName || ""}-${report.student?.firstName || ""}`}
            />
          </div>
        </div>
      </div>

      {/* DEC-6 : Bandeau absence */}
      {isBlockedByAbsence && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">
                  Bulletin bloqué : absence à une composition
                </p>
                <p className="text-sm text-red-700 mt-1">
                  L'élève a été absent à une composition et n'a pas de dérogation.
                  Le bulletin ne peut pas être validé tant que l'absence n'est pas traitée.
                </p>
                {isEditable && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 border-red-300 text-red-700 hover:bg-red-100"
                    onClick={() => setShowClearModal(true)}
                  >
                    Marquer l'absence comme traitée
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DEC-9 : Bandeau bulletin obsolète */}
      {report.isStale && !isBlockedByAbsence && (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-orange-900">
                  Bulletin obsolète
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  Les notes ont été modifiées depuis la dernière génération.
                  Régénérez le bulletin pour mettre à jour la moyenne et le rang.
                </p>
                {isEditable && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-100"
                    onClick={() =>
                      regenerateMutation.mutate({
                        studentId: report.studentId,
                        termId: report.termId,
                        classId: report.classId,
                        academicYearId: report.academicYearId,
                      })
                    }
                    disabled={regenerateMutation.isPending}
                  >
                    {regenerateMutation.isPending ? "Régénération…" : "Régénérer le bulletin"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Moyenne générale"
          value={avg !== null ? `${avg.toFixed(2)} / ${scale}` : "—"}
          subtitle={autoAppr}
          icon={<TrendingUp className="h-4 w-4" />}
          color={apprColor}
        />
        <StatCard
          label="Rang"
          value={
            report.rank ? `${report.rank}/${report.classSize || "?"}` : "—"
          }
          icon={<Award className="h-4 w-4" />}
          color="text-yellow-600"
        />
        <StatCard
          label="Absences"
          value={String(report.absencesCount || 0)}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="text-orange-600"
        />
        <StatCard
          label="Retards"
          value={String(report.latesCount || 0)}
          icon={<Calendar className="h-4 w-4" />}
          color="text-blue-600"
        />
      </div>

      {/* ✅ NOUVEAU : SECTION ASSIDUITÉ */}
      {report.studentId && report.academicYearId && (
        <AttendanceSummaryCard
          studentId={report.studentId}
          academicYearId={report.academicYearId}
        />
      )}

      {/* DÉTAIL PAR MATIÈRE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            📚 Détail par matière
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Aucune matière enregistrée
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="text-left p-3 font-medium">Matière</th>
                    <th className="text-center p-3 font-medium w-16">Coef</th>
                    <th className="text-center p-3 font-medium w-24">Moyenne</th>
                    <th className="text-center p-3 font-medium w-24">Coef × Moy</th>
                    <th className="text-center p-3 font-medium w-20">Rang</th>
                    <th className="text-center p-3 font-medium w-32">Appréciation</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const itemAvg =
                      item.average !== null ? Number(item.average) : null;
                    const weighted =
                      item.weighted !== null
                        ? Number(item.weighted)
                        : itemAvg !== null
                          ? itemAvg * Number(item.coefficient)
                          : null;
                    const itemAppr = getAppreciation(itemAvg, scale);
                    const itemColor = getAppreciationColor(itemAvg, scale);

                    return (
                      <tr
                        key={item.id}
                        className="border-b last:border-0 hover:bg-muted/30"
                      >
                        <td className="p-3 font-medium">
                          {item.subject?.name || "—"}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {Number(item.coefficient)}
                        </td>
                        <td className="p-3 text-center">
                          {itemAvg !== null ? (
                            <span className={cn("font-mono font-medium", itemColor)}>
                              {itemAvg.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono text-muted-foreground">
                          {weighted !== null ? weighted.toFixed(2) : "—"}
                        </td>
                        <td className="p-3 text-center">
                          {item.rank ? (
                            <span className="font-mono">{item.rank}e</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={cn("text-xs font-medium", itemColor)}>
                            {itemAppr}
                          </span>
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

      {/* DÉCISION */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            🎯 Décision du conseil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DecisionEditor
            value={decision}
            disabled={!isEditable}
            onChange={(v) => {
              setDecision(v);
              setHasChanges(true);
            }}
          />
        </CardContent>
      </Card>

      {/* APPRÉCIATION */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            💬 Appréciation générale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AppreciationEditor
            value={appreciation}
            average={avg}
            scale={scale}
            disabled={!isEditable}
            onChange={(v) => {
              setAppreciation(v);
              setHasChanges(true);
            }}
          />
        </CardContent>
      </Card>

      {/* FOOTER ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-3 sticky bottom-4 bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          {hasChanges && isEditable && (
            <span className="text-orange-600 dark:text-orange-400 font-medium">
              ● Modifications non enregistrées
            </span>
          )}
          {!hasChanges && isEditable && (
            <span className="text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 inline mr-1" />
              À jour
            </span>
          )}
          {isPublished && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              ✓ Bulletin publié
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditable && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
          )}
          {canValidate && (
            <Button
              size="sm"
              onClick={handleValidate}
              disabled={validateMutation.isPending}
            >
              {validateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Valider
            </Button>
          )}
          {canPublish && (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={publishMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {publishMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Publier
            </Button>
          )}
        </div>
      </div>

      {/* DEC-6 : Modale de dérogation */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Marquer l'absence comme traitée</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cette action créera une dérogation qui permettra de valider le bulletin.
              Elle sera tracée (auteur, date, motif).
            </p>
            <label className="block text-sm font-medium mb-1">
              Motif (5 à 500 caractères)
            </label>
            <textarea
              value={clearMotive}
              onChange={(e) => setClearMotive(e.target.value)}
              className="w-full border rounded-md p-2 text-sm mb-4"
              rows={3}
              placeholder="Ex. : Certificat médical fourni, absence justifiée a posteriori"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => { setShowClearModal(false); setClearMotive(""); }}
                disabled={clearAbsencesMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                onClick={async () => {
                  if (!id || clearMotive.trim().length < 5) return;
                  await clearAbsencesMutation.mutateAsync({ id, motive: clearMotive });
                  setShowClearModal(false);
                  setClearMotive("");
                }}
                disabled={clearMotive.trim().length < 5 || clearAbsencesMutation.isPending}
              >
                {clearAbsencesMutation.isPending ? "Enregistrement…" : "Confirmer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
function StatCard({
  label,
  value,
  subtitle,
  icon,
  color,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {icon}
          {label}
        </div>
        <div className={cn("text-2xl font-bold", color)}>{value}</div>
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}