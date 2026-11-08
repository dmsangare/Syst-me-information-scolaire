import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Plus,
  Eye,
  Lock,
  Unlock,
  Edit,
  ClipboardList,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import {
  Button,
  Input,
  PageLoader,
  EmptyState,
  KpiCard,
} from "@/components/ui";
import { DataTable, Column } from "@/components/shared";
import { cn } from "@/lib/utils";
import { useAssessments, useUpdateAssessmentStatus } from "@/hooks/assessments";
import { useClasses, useLevels } from "@/hooks/classes";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { formatDate } from "@/lib/formatters";
import { CreateAssessmentModal } from "./components/CreateAssessmentModal";
import { QuickGradeEntryModal } from "./components/QuickGradeEntryModal";
import { useAuth } from "@/contexts/AuthContext";
import { useIsReadOnly } from "@/hooks/auth/useIsReadOnly";

interface Assessment {
  id: string;
  title: string;
  type: string;
  status: string;
  date?: string;
  maxScore: number;
  coefficient: number;
  classId?: string;
  class?: { capacity?: number; name?: string };
  _count?: { grades?: number; enrollments?: number };
}

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

const TYPE_LABELS: Record<
  string,
  { label: string; emoji: string; variant: BadgeVariant }
> = {
  INTERROGATION: { label: "Interrogation", emoji: "❔", variant: "neutral" },
  DEVOIR: { label: "Devoir", emoji: "🔵", variant: "info" },
  CONTROLE: { label: "Contrôle", emoji: "🟣", variant: "info" },
  COMPOSITION: { label: "Composition", emoji: "🟠", variant: "warning" },
  EXAMEN: { label: "Examen", emoji: "🔴", variant: "danger" },
  TP: { label: "TP", emoji: "🟢", variant: "success" },
  ORAL: { label: "Oral", emoji: "🟡", variant: "warning" },
  PROJET: { label: "Projet", emoji: "🔷", variant: "info" },
};

const STATUS_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: "Brouillon", variant: "neutral" },
  OPEN: { label: "Ouverte", variant: "info" },
  SUBMITTED: { label: "Soumise", variant: "warning" },
  VALIDATED: { label: "Validée", variant: "success" },
  LOCKED: { label: "Verrouillée", variant: "neutral" },
};

export function AssessmentsListPage() {
  const { hasPermission } = useAuth();
  const isReadOnly = useIsReadOnly();
  const canCreate = hasPermission("assessment:create");
  
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  
  const [createOpen, setCreateOpen] = useState(false);
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);

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

  const { data: subjects } = useQuery({
    queryKey: ["subjects", "list"],
    queryFn: async () => {
      const { data } = await api.get("/subjects");
      return data.data || data;
    },
    staleTime: 10 * 60_000,
  });

  const filters: Record<string, string> = {};
  if (classId) filters.classId = classId;
  if (termId) filters.termId = termId;
  if (subjectId) filters.subjectId = subjectId;
  if (typeFilter) filters.type = typeFilter;

  const { data, isLoading } = useAssessments(filters);

  const rawList = Array.isArray(data) ? data : (data as any)?.data || [];
  const allAssessments: Assessment[] = Array.isArray(rawList) ? rawList : [];

  const assessments = useMemo(() => {
    if (!search.trim()) return allAssessments;
    const q = search.toLowerCase();
    return allAssessments.filter((a) => a.title?.toLowerCase().includes(q));
  }, [allAssessments, search]);

  const totalAssessments = assessments.length;
  const totalGrades = assessments.reduce(
    (sum, a) => sum + (a._count?.grades || 0),
    0,
  );

  const sortedClasses = useMemo(() => {
    if (!classes || !levels) return [];
    return [...classes].sort((a, b) => {
      const la = levels.find((l) => l.id === a.levelId)?.orderIndex ?? 999;
      const lb = levels.find((l) => l.id === b.levelId)?.orderIndex ?? 999;
      if (la !== lb) return la - lb;
      return a.code.localeCompare(b.code);
    });
  }, [classes, levels]);

  const handleReset = () => {
    setClassId("");
    setTermId("");
    setSubjectId("");
    setTypeFilter("");
    setSearch("");
  };

  const hasFilters = Boolean(classId || termId || subjectId || typeFilter || search);

  const columns: Column<Assessment>[] = [
    {
      key: "type",
      header: "Type",
      cell: (a) => {
        const info = TYPE_LABELS[a.type] || TYPE_LABELS.DEVOIR;
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
              info.variant === "success" && "bg-sis-success-bg text-sis-success border-sis-success-border",
              info.variant === "danger" && "bg-sis-danger-bg text-sis-danger border-sis-danger-border",
              info.variant === "warning" && "bg-sis-warning-bg text-sis-warning border-sis-warning-border",
              info.variant === "info" && "bg-sis-info-bg text-sis-info border-sis-info-border",
              info.variant === "neutral" && "bg-sis-neutral-100 text-sis-neutral-700 border-sis-neutral-200",
            )}
          >
            <span>{info.emoji}</span>
            {info.label}
          </span>
        );
      },
    },
    {
      key: "title",
      header: "Titre",
      cell: (a) => <span className="font-medium">{a.title}</span>,
    },
    {
      key: "date",
      header: "Date",
      cell: (a) => (
        <span className="text-muted-foreground">
          {a.date ? formatDate(a.date) : "—"}
        </span>
      ),
    },
    {
      key: "maxScore",
      header: "Barème",
      headerClassName: "text-center",
      className: "text-center",
      cell: (a) => (
        <span className="font-mono">/{Number(a.maxScore).toFixed(0)}</span>
      ),
    },
    {
      key: "coefficient",
      header: "Coef",
      headerClassName: "text-center",
      className: "text-center",
      cell: (a) => <span className="font-mono">{a.coefficient}</span>,
    },
    {
      key: "grades",
      header: "Notes",
      headerClassName: "text-center",
      className: "text-center",
      cell: (a) => {
        const gradeCount = a._count?.grades || 0;
        const classSize = a._count?.enrollments || a.class?.capacity || 40;
        const fillRate = classSize > 0 ? (gradeCount / classSize) * 100 : 0;
        return (
          <div className="flex items-center gap-2 min-w-[80px]">
            <div className="flex-1 h-1.5 bg-sis-neutral-100 rounded-full overflow-hidden dark:bg-sis-neutral-800">
              <div
                className={cn(
                  "h-full transition-all",
                  fillRate >= 90 ? "bg-sis-success" : fillRate >= 50 ? "bg-sis-brand" : "bg-sis-warning",
                )}
                style={{ width: `${Math.min(fillRate, 100)}%` }}
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
              {gradeCount}/{classSize}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Statut",
      headerClassName: "text-center",
      className: "text-center",
      cell: (a) => {
        const info = STATUS_LABELS[a.status] || STATUS_LABELS.DRAFT;
        return (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
              info.variant === "success" && "bg-sis-success-bg text-sis-success border-sis-success-border",
              info.variant === "danger" && "bg-sis-danger-bg text-sis-danger border-sis-danger-border",
              info.variant === "warning" && "bg-sis-warning-bg text-sis-warning border-sis-warning-border",
              info.variant === "info" && "bg-sis-info-bg text-sis-info border-sis-info-border",
              info.variant === "neutral" && "bg-sis-neutral-100 text-sis-neutral-700 border-sis-neutral-200",
            )}
          >
            {info.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (a) => <AssessmentActions assessment={a} />,
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
            <h1 className="text-2xl font-bold tracking-tight">Notes & Évaluations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez les évaluations de votre établissement
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setQuickEntryOpen(true)} disabled={isReadOnly} title={isReadOnly ? "Action non autorisée" : undefined}>
            <Edit className="h-4 w-4 mr-2" />
            Saisir des notes
          </Button>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)} disabled={isReadOnly} title={isReadOnly ? "Action non autorisée" : undefined}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle évaluation
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard
          label="Évaluations"
          value={totalAssessments}
          hint={hasFilters ? "Selon vos filtres" : "Toutes les évaluations"}
          icon={<ClipboardList className="h-5 w-5" />}
          accent="brand"
        />
        <KpiCard
          label="Notes saisies"
          value={totalGrades}
          hint="Total des notes enregistrées"
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="success"
        />
      </div>

      <div className="rounded-sis-lg border border-sis-neutral-200 bg-card p-4 dark:border-sis-neutral-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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

          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="h-10 rounded-sis-md border border-sis-neutral-200 bg-card px-3 text-sm transition-colors hover:border-sis-neutral-300 focus:outline-none focus:ring-2 focus:ring-sis-brand/30 focus:border-sis-brand dark:border-sis-neutral-700 dark:bg-sis-neutral-900"
          >
            <option value="">📚 Toutes les matières</option>
            {subjects?.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-sis-md border border-sis-neutral-200 bg-card px-3 text-sm transition-colors hover:border-sis-neutral-300 focus:outline-none focus:ring-2 focus:ring-sis-brand/30 focus:border-sis-brand dark:border-sis-neutral-700 dark:bg-sis-neutral-900"
          >
            <option value="">📝 Tous les types</option>
            <option value="DEVOIR">🔵 Devoir</option>
            <option value="INTERROGATION">❔ Interrogation</option>
            <option value="COMPOSITION">🟠 Composition</option>
            <option value="CONTROLE">🟣 Contrôle</option>
            <option value="EXAMEN">🔴 Examen</option>
            <option value="TP">🟢 Travaux Pratiques</option>
            <option value="ORAL">🟡 Oral</option>
            <option value="PROJET">🔷 Projet</option>
          </select>

          <div className="relative">
            <Input
              placeholder="Rechercher un titre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-sis-md border-sis-neutral-200 focus:ring-sis-brand/30 focus:border-sis-brand dark:border-sis-neutral-700"
            />
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Réinitialiser les filtres
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <PageLoader label="Chargement des évaluations..." />
      ) : assessments.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title="Aucune évaluation trouvée"
          description={
            hasFilters
              ? "Essayez de modifier les filtres de recherche."
              : "Créez votre première évaluation pour commencer."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={handleReset}>
                Réinitialiser les filtres
              </Button>
            ) : canCreate && !isReadOnly ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle évaluation
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          data={assessments}
          columns={columns}
          keyExtractor={(a) => a.id}
        />
      )}

      {createOpen && !isReadOnly && (
        <CreateAssessmentModal onClose={() => setCreateOpen(false)} />
      )}
      {quickEntryOpen && !isReadOnly && (
        <QuickGradeEntryModal onClose={() => setQuickEntryOpen(false)} />
      )}
    </div>
  );
}

function AssessmentActions({ assessment }: { assessment: Assessment }) {
  const { hasPermission } = useAuth();
  const isReadOnly = useIsReadOnly();
  const canManage = hasPermission("assessment:update") && !isReadOnly;

  const isLocked = assessment.status === "LOCKED";
  const canLock = assessment.status === "VALIDATED";
  const canGrade = ["OPEN", "SUBMITTED", "DRAFT"].includes(assessment.status);

  const statusMutation = useUpdateAssessmentStatus();

  const handleLock = async (action: "lock" | "reopen") => {
    await statusMutation.mutateAsync({ id: assessment.id, action });
  };

  return (
    <div className="flex items-center justify-end gap-1">
      {canGrade ? (
        <Button asChild variant="ghost" size="sm" disabled={isReadOnly} title={isReadOnly ? "Action non autorisée" : undefined}>
          <Link to={`/assessments/${assessment.id}/grades`}>
            <Edit className="h-3.5 w-3.5 mr-1" />
            Saisir
          </Link>
        </Button>
      ) : (
        <Button asChild variant="ghost" size="sm">
          <Link to={`/assessments/${assessment.id}/grades`}>
            <Eye className="h-3.5 w-3.5 mr-1" />
            Voir
          </Link>
        </Button>
      )}
      {canManage && canLock && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleLock("lock")}
          disabled={statusMutation.isPending}
          title="Verrouiller l'évaluation"
        >
          <Lock className="h-3.5 w-3.5" />
        </Button>
      )}
      {canManage && isLocked && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleLock("reopen")}
          disabled={statusMutation.isPending}
          title="Réouvrir l'évaluation"
        >
          <Unlock className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}