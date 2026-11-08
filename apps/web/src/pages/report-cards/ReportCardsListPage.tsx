import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Plus,
  Eye,
  Search,
  FileDown,
  CheckCircle2,
  Send,
  FileCheck2,
  FileClock,
} from "lucide-react";
import {
  Button,
  Input,
  PageLoader,
  EmptyState,
  KpiCard,
  StatusBadge,
} from "@/components/ui";
import { DataTable, Column } from "@/components/shared";
import { cn } from "@/lib/utils";
import {
  useReportCards,
  usePublishReportCard,
  useValidateReportCard,
} from "@/hooks/report-cards";
import { useClasses, useLevels } from "@/hooks/classes";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import {
  STATUS_LABELS,
  getAppreciation,
  getAppreciationColor,
} from "@/types/report-cards";
import type { ReportCard } from "@/types/report-cards";
import { GenerateReportCardsModal } from "./components/GenerateReportCardsModal";
import { useGenerateClassPdf, useClassPdfStatus } from "@/hooks/report-cards/useClassPdf";
import { PublishClassModal } from "./components/PublishClassModal";
import { useAuth } from "@/contexts/AuthContext";
import { useIsReadOnly } from "@/hooks/auth/useIsReadOnly";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "PUBLISHED":
      return "success";
    case "VALIDATED":
      return "info";
    case "DRAFT":
      return "neutral";
    default:
      return "neutral";
  }
}

export function ReportCardsListPage() {
  const { hasPermission } = useAuth();
  const isReadOnly = useIsReadOnly();
  const canManage = hasPermission("report_card:create") && !isReadOnly;
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [search, setSearch] = useState("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [classPdfJobId, setClassPdfJobId] = useState<string | null>(null);
  const generateClassPdf = useGenerateClassPdf();
  const { data: classPdfStatus } = useClassPdfStatus(classPdfJobId);

  const { data: classes } = useClasses();
  const { data: levels } = useLevels();

  const { data: terms } = useQuery({
    queryKey: ["terms", "list"],
    queryFn: async () => {
      const { data } = await api.get("/terms");
      return data.data || data;
    },
    staleTime: 10 * 60_000,
  });

  const filters: Record<string, string> = {};
  if (classId) filters.classId = classId;
  if (termId) filters.termId = termId;

  const { data, isLoading } = useReportCards(filters);

  const allReports: ReportCard[] = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : (data as any).data || [];
  }, [data]);

  const reports = useMemo(() => {
    if (!search.trim()) return allReports;
    const q = search.toLowerCase();
    return allReports.filter((r) => {
      const name = `${r.student?.lastName || ""} ${r.student?.firstName || ""}`;
      const matricule = r.student?.matricule || "";
      return (
        name.toLowerCase().includes(q) || matricule.toLowerCase().includes(q)
      );
    });
  }, [allReports, search]);

  const sortedClasses = useMemo(() => {
    if (!classes || !levels) return [];
    return [...classes].sort((a, b) => {
      const la = levels.find((l) => l.id === a.levelId)?.orderIndex ?? 999;
      const lb = levels.find((l) => l.id === b.levelId)?.orderIndex ?? 999;
      if (la !== lb) return la - lb;
      return a.code.localeCompare(b.code);
    });
  }, [classes, levels]);

  const totalCount = reports.length;
  const publishedCount = reports.filter((r) => r.status === "PUBLISHED").length;
  const draftCount = reports.filter((r) => r.status === "DRAFT").length;

  const handleGenerateClassPdf = () => {
    if (!classId) {
      alert("Sélectionnez une classe");
      return;
    }
    generateClassPdf.mutate(
      { classId, academicYearId: "" },
      { onSuccess: (data) => setClassPdfJobId(data.jobId) },
    );
  };

  const hasFilters = Boolean(classId || termId || search);

  const handleReset = () => {
    setClassId("");
    setTermId("");
    setSearch("");
  };

  const columns: Column<ReportCard>[] = [
    {
      key: "student",
      header: "Élève",
      cell: (r) => (
        <div className="flex items-center gap-2">
          {r.student?.gender && (
            <span
              className={cn(
                "inline-flex items-center justify-center h-8 w-8 rounded-full text-xs font-semibold shrink-0",
                r.student.gender === "M"
                  ? "bg-sis-info-bg text-sis-info"
                  : "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
              )}
            >
              {r.student.firstName[0]}
              {r.student.lastName[0]}
            </span>
          )}
          <div>
            <div className="font-medium">
              {r.student ? `${r.student.lastName} ${r.student.firstName}` : "—"}
            </div>
            {r.student?.matricule && (
              <div className="text-xs text-muted-foreground font-mono">
                {r.student.matricule}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "class",
      header: "Classe",
      cell: (r) => (
        <span className="text-muted-foreground">{r.class?.name || "—"}</span>
      ),
    },
    {
      key: "term",
      header: "Trimestre",
      cell: (r) => (
        <span className="text-muted-foreground">{r.term?.name || "—"}</span>
      ),
    },
    {
      key: "average",
      header: "Moyenne",
      headerClassName: "text-center",
      className: "text-center",
      cell: (r) => {
        const scale = r.scale ?? 20;
        const appreciationColor = getAppreciationColor(r.average, scale);
        if (r.average === null || r.average === undefined) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <span className={cn("font-bold text-base", appreciationColor)}>
            {Number(r.average).toFixed(2)}
            <span className="text-xs font-normal text-muted-foreground">
              {" "}
              / {scale}
            </span>
          </span>
        );
      },
    },
    {
      key: "rank",
      header: "Rang",
      headerClassName: "text-center",
      className: "text-center",
      cell: (r) => {
        if (!r.rank) return <span className="text-muted-foreground">—</span>;
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              r.rank === 1 &&
                "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
              r.rank === 2 &&
                "bg-sis-neutral-200 text-sis-neutral-700 dark:bg-sis-neutral-700 dark:text-sis-neutral-200",
              r.rank === 3 &&
                "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
              r.rank > 3 &&
                "bg-sis-neutral-100 text-sis-neutral-700 dark:bg-sis-neutral-800 dark:text-sis-neutral-300",
            )}
          >
            {r.rank === 1 && "🥇"}
            {r.rank === 2 && "🥈"}
            {r.rank === 3 && "🥉"}
            {r.rank}/{r.classSize || "?"}
          </span>
        );
      },
    },
    {
      key: "appreciation",
      header: "Appréciation",
      cell: (r) => {
        const scale = r.scale ?? 20;
        const appreciation = getAppreciation(r.average, scale);
        const appreciationColor = getAppreciationColor(r.average, scale);
        return (
          <span className={cn("text-sm font-medium", appreciationColor)}>
            {appreciation}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Statut",
      headerClassName: "text-center",
      className: "text-center",
      cell: (r) => {
        const info = STATUS_LABELS[r.status] || STATUS_LABELS.DRAFT;
        return (
          <StatusBadge
            variant={getStatusVariant(r.status)}
            showIcon={false}
          >
            {info.label}
          </StatusBadge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (r) => <ReportCardActions report={r} />,
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-sis-md bg-sis-brand-50 text-sis-brand mt-0.5 dark:bg-sis-brand-900/30 dark:text-sis-brand-300">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bulletins</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez et publiez les bulletins de vos élèves
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <>
              <Button variant="outline" onClick={() => setPublishOpen(true)}>
                <Send className="h-4 w-4 mr-2" />
                Publier une classe
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerateClassPdf}
                disabled={generateClassPdf.isPending || !!classPdfJobId}
              >
                <FileDown className="h-4 w-4 mr-2" />
                {classPdfJobId
                  ? `Génération… (${classPdfStatus?.progress ?? 0}%)`
                  : "Imprimer classe (ZIP)"}
              </Button>
              <Button onClick={() => setGenerateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Générer les bulletins
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="Total bulletins"
          value={totalCount}
          hint={hasFilters ? "Selon vos filtres" : "Tous les bulletins"}
          icon={<FileText className="h-5 w-5" />}
          accent="brand"
        />
        <KpiCard
          label="Brouillons"
          value={draftCount}
          hint="À valider"
          icon={<FileClock className="h-5 w-5" />}
          accent="warning"
        />
        <KpiCard
          label="Publiés"
          value={publishedCount}
          hint="Visibles aux parents"
          icon={<FileCheck2 className="h-5 w-5" />}
          accent="success"
        />
      </div>

      <div className="rounded-sis-lg border border-sis-neutral-200 bg-card p-4 dark:border-sis-neutral-800">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="h-10 rounded-sis-md border border-sis-neutral-200 bg-card px-3 text-sm transition-colors hover:border-sis-neutral-300 focus:outline-none focus:ring-2 focus:ring-sis-brand/30 focus:border-sis-brand dark:border-sis-neutral-700 dark:bg-sis-neutral-900"
          >
            <option value="">🏫 Toutes les classes</option>
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

          <select
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
            className="h-10 rounded-sis-md border border-sis-neutral-200 bg-card px-3 text-sm transition-colors hover:border-sis-neutral-300 focus:outline-none focus:ring-2 focus:ring-sis-brand/30 focus:border-sis-brand dark:border-sis-neutral-700 dark:bg-sis-neutral-900"
          >
            <option value="">📅 Tous les trimestres</option>
            {terms?.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <Input
            placeholder="Rechercher un élève (nom, matricule)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-sis-md border-sis-neutral-200 focus:ring-sis-brand/30 focus:border-sis-brand dark:border-sis-neutral-700"
          />
        </div>
      </div>

      {isLoading ? (
        <PageLoader label="Chargement des bulletins..." />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title="Aucun bulletin trouvé"
          description={
            hasFilters
              ? "Essayez de modifier les filtres de recherche."
              : "Générez vos premiers bulletins pour commencer."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={handleReset}>
                Réinitialiser les filtres
              </Button>
            ) : canManage ? (
              <Button onClick={() => setGenerateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Générer les bulletins
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          data={reports}
          columns={columns}
          keyExtractor={(r) => r.id}
        />
      )}

      {generateOpen && !isReadOnly && (
        <GenerateReportCardsModal onClose={() => setGenerateOpen(false)} />
      )}
      {publishOpen && !isReadOnly && (
        <PublishClassModal onClose={() => setPublishOpen(false)} />
      )}
    </div>
  );
}

function ReportCardActions({ report }: { report: ReportCard }) {
  const { hasPermission } = useAuth();
  const isReadOnly = useIsReadOnly();
  const canManage = hasPermission("report_card:update") && !isReadOnly;

  const validateMutation = useValidateReportCard();
  const publishMutation = usePublishReportCard();

  return (
    <div className="flex items-center justify-end gap-1">
      <Button asChild variant="ghost" size="sm">
        <Link to={`/report-cards/${report.id}`}>
          <Eye className="h-3.5 w-3.5 mr-1" />
          Voir
        </Link>
      </Button>
      {canManage && report.status === "DRAFT" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => validateMutation.mutateAsync(report.id)}
          disabled={validateMutation.isPending}
          title="Valider"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </Button>
      )}
      {canManage && report.status === "VALIDATED" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => publishMutation.mutateAsync(report.id)}
          disabled={publishMutation.isPending}
          title="Publier"
          className="text-sis-success hover:text-sis-success/80"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}