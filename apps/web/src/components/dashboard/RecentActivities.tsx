import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { useRecentActivities } from "@/hooks/dashboard/useDashboardCharts";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export function RecentActivities() {
  const { data, isLoading, isError } = useRecentActivities(10);
  const items = data?.data ?? [];

  return (
    <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-600" />
          Dernières activités
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="p-6 text-sm text-slate-400">Chargement…</div>
        )}
        {isError && (
          <div className="p-6">
            <EmptyState
              title="Impossible de charger les activités"
              description="Réessaie plus tard."
            />
          </div>
        )}
        {!isLoading && !isError && items.length === 0 && (
          <div className="p-6">
            <EmptyState
              title="Aucune activité récente"
              description="Les actions effectuées apparaîtront ici."
            />
          </div>
        )}
        {!isLoading && !isError && items.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {items.map((a) => (
              <li key={a.id} className="flex items-start gap-3 p-4">
                <div className="mt-0.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Activity className="h-4 w-4" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 truncate">
                    {a.label}
                    {a.title && (
                      <span className="text-slate-400"> — {a.title}</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {a.module} · {timeAgo(a.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}