import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { School } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { useClassesDistribution } from "@/hooks/dashboard/useDashboardCharts";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#6366F1"];

export function ClassesDistributionDonut() {
  const { data, isLoading, isError } = useClassesDistribution();
  const levels = data?.levels ?? [];
  const total = data?.total ?? 0;

  return (
    <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
          <School className="h-4 w-4 text-blue-600" />
          Répartition des classes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="flex h-64 items-center justify-center text-sm text-slate-400">Chargement…</div>}
        {isError && <EmptyState title="Erreur" description="Impossible de charger la répartition." />}
        {!isLoading && !isError && levels.length === 0 && (
          <EmptyState title="Aucune donnée" description="Aucune classe active." />
        )}
        {!isLoading && !isError && levels.length > 0 && (
          <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
            <div className="relative h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={levels} dataKey="count" nameKey="levelName" innerRadius="65%" outerRadius="90%" paddingAngle={4} stroke="none">
                    {levels.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: 12 }} formatter={(v: any, n: any) => [`${v} classe(s)`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-900">{total}</span>
                <span className="text-xs text-slate-500 font-medium">classes</span>
              </div>
            </div>
            <div className="space-y-2">
              {levels.map((l, i) => (
                <div key={l.levelId} className="flex items-center gap-3 text-sm">
                  <span className="inline-block h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="truncate text-slate-600 font-medium">{l.levelName}</span>
                  <span className="ml-auto font-bold text-slate-900">{l.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}