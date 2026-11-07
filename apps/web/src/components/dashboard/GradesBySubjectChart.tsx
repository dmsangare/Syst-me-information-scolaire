import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui";
import { useClasses } from "@/hooks/classes";
import { useGradesBySubject } from "@/hooks/dashboard/useDashboardCharts";

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#6366F1",
  "#EF4444",
];

export function GradesBySubjectChart() {
  const [classId, setClassId] = useState("");
  const { data: classes } = useClasses();
  const { data, isLoading, isError } = useGradesBySubject(classId);

  const subjects = data?.subjects ?? [];
  const scale = data?.scale ?? 20;

  return (
    <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          Répartition des notes par matière
        </CardTitle>
        {data?.term && (
          <span className="text-xs text-slate-400">{data.term.name}</span>
        )}
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <select
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">— Choisir une classe —</option>
            {classes?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {!classId && (
          <EmptyState
            title="Sélectionne une classe"
            description="Choisis une classe pour voir les moyennes par matière."
          />
        )}

        {classId && isLoading && (
          <div className="h-64 flex items-center justify-center text-sm text-slate-400">
            Chargement…
          </div>
        )}

        {classId && isError && (
          <EmptyState title="Erreur" description="Impossible de charger les notes." />
        )}

        {classId && !isLoading && !isError && subjects.length === 0 && (
          <EmptyState title="Aucune note" description="Aucune note saisie pour cette classe." />
        )}

        {classId && !isLoading && !isError && subjects.length > 0 && (
          <>
            <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
              <span>Échelle :</span>
              <span className="font-semibold text-slate-700">sur /{scale}</span>
              {data?.class?.level?.cycle && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {data.class.level.cycle === "PREMIER_CYCLE"
                    ? "1er cycle"
                    : data.class.level.cycle === "DEUXIEME_CYCLE"
                    ? "2e cycle"
                    : "Lycée"}
                </span>
              )}
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjects} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="subjectName"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    domain={[0, scale]}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: 12 }}
                    formatter={(value: any, name: any, props: any) => {
                      const item = props.payload;
                      return [
                        `${value} / ${scale} (${item.gradesCount} note${item.gradesCount > 1 ? "s" : ""})`,
                        "Moyenne",
                      ];
                    }}
                  />
                  <Bar dataKey="average" radius={[6, 6, 0, 0]} maxBarSize={50} label={{ position: "top", fontSize: 11, fill: "#1E293B", fontWeight: 600 }}>
                    {subjects.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}