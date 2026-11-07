import { Link } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  StatusBadge,
} from "@/components/ui";
import { useRecentReportCards } from "@/hooks/dashboard/useDashboardCharts";

const STATUS_LABEL: Record<string, { label: string; variant: any; className: string }> = {
  DRAFT: {
    label: "Brouillon",
    variant: "warning",
    className: "bg-amber-50 text-amber-600 border-0",
  },
  VALIDATED: {
    label: "Validé",
    variant: "info",
    className: "bg-blue-50 text-blue-600 border-0",
  },
  PUBLISHED: {
    label: "Publié",
    variant: "success",
    className: "bg-emerald-50 text-emerald-600 border-0",
  },
};

export function RecentReportCards() {
  const { data, isLoading, isError } = useRecentReportCards(5);
  const items = data?.data ?? [];

  return (
    <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
          Bulletins récents
        </CardTitle>
        <Link
          to="/report-cards"
          className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
        >
          Tout voir <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="p-6 text-sm text-slate-400">Chargement…</div>
        )}
        {isError && (
          <div className="p-6">
            <EmptyState
              title="Impossible de charger les bulletins"
              description="Réessaie plus tard."
            />
          </div>
        )}
        {!isLoading && !isError && items.length === 0 && (
          <div className="p-6">
            <EmptyState
              title="Aucun bulletin"
              description="Aucun bulletin généré pour le moment."
            />
          </div>
        )}
        {!isLoading && !isError && items.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {items.map((rc) => {
              const status = STATUS_LABEL[rc.status] ?? {
                label: rc.status,
                variant: "neutral" as const,
                className: "bg-slate-100 text-slate-600 border-0",
              };
              return (
                <li
                  key={rc.id}
                  className="p-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {rc.student.firstName} {rc.student.lastName}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {rc.class.name} · {rc.term.name}
                      </p>
                    </div>
                    <StatusBadge
                      variant={status.variant}
                      showIcon={false}
                      className={`rounded-full ${status.className}`}
                    >
                      {status.label}
                    </StatusBadge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}