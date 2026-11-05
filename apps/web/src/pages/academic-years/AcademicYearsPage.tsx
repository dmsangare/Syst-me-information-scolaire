import { useState } from "react";
import {
  Calendar,
  Loader2,
  CheckCircle2,
  Lock,
  Archive,
  Plus,
  AlertTriangle,
  Info,
  Wallet,
} from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  useAcademicYearsList,
  useActivateAcademicYear,
  useCloseAcademicYear,
  useArchiveAcademicYear,
  useClosingSummary,
} from "@/hooks/academic-years";
import type { AcademicYear, AcademicYearStatus } from "@/api/academic-years";
import { CreateAcademicYearModal } from "./components/CreateAcademicYearModal";
import { FinanceClosureModal } from "./components/FinanceClosureModal";

const STATUS_STYLE: Record<AcademicYearStatus, { label: string; cls: string }> = {
  PREPARATION: { label: "En preparation", cls: "bg-blue-500/10 text-blue-700" },
  ACTIVE: { label: "En cours", cls: "bg-green-500/10 text-green-700" },
  CLOTUREE: { label: "Cloturee", cls: "bg-orange-500/10 text-orange-700" },
  ARCHIVEE: { label: "Archivee", cls: "bg-gray-500/10 text-gray-700" },
};

export function AcademicYearsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "close" | "archive";
    year: AcademicYear;
  } | null>(null);
  const [financeCloseTarget, setFinanceCloseTarget] = useState<AcademicYear | null>(null);

  const { data: years, isLoading } = useAcademicYearsList();
  const activateMutation = useActivateAcademicYear();
  const closeMutation = useCloseAcademicYear();
  const archiveMutation = useArchiveAcademicYear();

  const sortedYears: AcademicYear[] = (years || []).slice().sort((a, b) =>
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );

  const activeYear = sortedYears.find((y) => y.status === "ACTIVE");

  const handleActivate = (year: AcademicYear) => {
    if (
      activeYear &&
      !window.confirm(
        `L'annee ${activeYear.label} est actuellement active.\n` +
          `Activer ${year.label} va la desactiver (mais pas la cloturer).\n\nContinuer ?`,
      )
    ) {
      return;
    }
    activateMutation.mutate(year.id);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Annees scolaires
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Activez la nouvelle année a la rentree, cloturez l'ancienne en fin d'annee.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle annee
        </Button>
      </div>

      {/* INFO */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Seule une année peut etre <strong>active</strong> a la fois. Quand vous activez une
            nouvelle annee, l'ancienne passe en <strong>Cloturee</strong> automatiquement dans votre workflow.
            Verifiez le <strong>resume avant clôture</strong> pour voir les blocages eventuels.
          </p>
        </CardContent>
      </Card>

      {/* LISTE */}
      {sortedYears.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Aucune année scolaire. Cliquez sur "Nouvelle annee" pour commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedYears.map((year) => (
            <YearCard
              key={year.id}
              year={year}
              onActivate={() => handleActivate(year)}
              onClose={() => setConfirmAction({ type: "close", year })}
              onArchive={() => setConfirmAction({ type: "archive", year })}
              onFinanceClose={() => setFinanceCloseTarget(year)}
              isActivating={activateMutation.isPending}
              isClosing={closeMutation.isPending}
              isArchiving={archiveMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* MODALES */}
      {createOpen && (
        <CreateAcademicYearModal onClose={() => setCreateOpen(false)} />
      )}
      {financeCloseTarget && (
        <FinanceClosureModal
          year={financeCloseTarget}
          onClose={() => setFinanceCloseTarget(null)}
        />
      )}
      {confirmAction && (
        <ConfirmActionModal
          action={confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction.type === "close") {
              closeMutation.mutate(confirmAction.year.id);
            } else {
              archiveMutation.mutate(confirmAction.year.id);
            }
            setConfirmAction(null);
          }}
          isPending={closeMutation.isPending || archiveMutation.isPending}
        />
      )}
    </div>
  );
}

// ============================================================
// CARD ANNEE
// ============================================================

function YearCard({
  year,
  onActivate,
  onClose,
  onArchive,
  onFinanceClose,
  isActivating,
  isClosing,
  isArchiving,
}: {
  year: AcademicYear;
  onActivate: () => void;
  onClose: () => void;
  onArchive: () => void;
  onFinanceClose: () => void;
  isActivating: boolean;
  isClosing: boolean;
  isArchiving: boolean;
}) {
  const statusInfo = STATUS_STYLE[year.status];
  const { data: summary } = useClosingSummary(
    year.status === "ACTIVE" ? year.id : undefined,
  );

  const canActivate = year.status === "PREPARATION";
  const canClose = year.status === "ACTIVE";
  const canArchive = year.status === "CLOTUREE";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-bold">{year.label}</h3>
              <span
                className={cn(
                  "inline-block px-2 py-0.5 rounded text-xs font-medium",
                  statusInfo.cls,
                )}
              >
                {statusInfo.label}
              </span>
              {year.isCurrent && (
                <span className="text-xs text-green-700 font-medium">
                  · Année courante
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(year.startDate).toLocaleDateString("fr-FR")} â†’{" "}
              {new Date(year.endDate).toLocaleDateString("fr-FR")}
            </p>
            {year._count && (
              <p className="text-xs text-muted-foreground mt-1">
                {year._count.classes} classe(s) · {year._count.enrollments} eleve(s) ·{" "}
                {year._count.terms} periode(s)
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {canActivate && (
              <Button size="sm" onClick={onActivate} disabled={isActivating}>
                {isActivating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                Activer
              </Button>
            )}
            {canClose && year.financeClosedAt === null && (
              <Button
                size="sm"
                variant="outline"
                onClick={onFinanceClose}
              >
                <Wallet className="h-4 w-4 mr-1" />
                Clôture finance
              </Button>
            )}
            {canClose && (
              <Button
                size="sm"
                variant="outline"
                onClick={onClose}
                disabled={isClosing || (summary && !summary.canClose)}
                title={
                  summary && !summary.canClose
                    ? "Des blocages empechent la cloture"
                    : ""
                }
              >
                {isClosing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-1" />
                )}
                Cloturer
              </Button>
            )}
            {canArchive && (
              <Button
                size="sm"
                variant="outline"
                onClick={onArchive}
                disabled={isArchiving}
              >
                {isArchiving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4 mr-1" />
                )}
                Archiver
              </Button>
            )}
          </div>
        </div>

        {/* Blocages/Warnings pour l'annee active */}
        {summary && (
          <>
            {summary.blockers.length > 0 && (
              <div className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-xs text-red-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Blocages :</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      {summary.blockers.map((b) => (
                        <li key={b.type}>
                          {b.label} : <strong>{b.count}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {summary.warnings.length > 0 && summary.blockers.length === 0 && (
              <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Avertissements :</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      {summary.warnings.map((w) => (
                        <li key={w.type}>
                          {w.label} : <strong>{w.count}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// MODAL CONFIRMATION
// ============================================================

function ConfirmActionModal({
  action,
  onClose,
  onConfirm,
  isPending,
}: {
  action: { type: "close" | "archive"; year: AcademicYear };
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const isClose = action.type === "close";
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-sis-lg shadow-2xl relative z-[10000] max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {isClose ? "Cloturer" : "Archiver"} cette année ?
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isClose
                  ? `L'annee ${action.year.label} ne sera plus modifiable. Les bulletins, notes et factures restent consultables.`
                  : `L'annee ${action.year.label} sera archivee (masquee par defaut).`}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Annuler
            </Button>
            <Button onClick={onConfirm} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isClose ? "Cloturer" : "Archiver"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
