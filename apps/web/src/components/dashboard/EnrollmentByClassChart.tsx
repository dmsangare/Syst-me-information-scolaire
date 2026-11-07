import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { useEnrollmentByClass } from "@/hooks/dashboard/useDashboardCharts";

export function EnrollmentByClassChart() {
  const { data, isLoading, isError } = useEnrollmentByClass();
  const classes = data?.classes ?? [];

  return (
    <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
          <Users className="h-4 w-4 text-blue-600" />
          Évolution des effectifs
        </CardTitle>
        {data?.academicYear && (
          <span className="text-xs font-medium text-slate-400">{data.academicYear}</span>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && <div className="flex h-64 items-center justify-center text-sm text-slate-400">Chargement…</div>}
        {isError && <EmptyState title="Erreur" description="Impossible de charger les effectifs." />}
        {!isLoading && !isError && classes.length === 0 && (
          <EmptyState title="Aucune donnée" description="Aucune classe pour cette année." />
        )}
        {!isLoading && !isError && classes.length > 0 && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="className" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} dy={10} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} cursor={{ fill: "#F8FAFC" }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="boys" name="Garçons" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={30} />
                <Bar dataKey="girls" name="Filles" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}