import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { api } from "@/lib/axios";

interface Props {
  studentId: string;
  academicYearId: string;
}

export function AttendanceSummaryCard({ studentId, academicYearId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["attendance-summary", studentId, academicYearId],
    queryFn: async () => {
      const { data } = await api.get(`/attendance/student/${studentId}/summary`, {
        params: { academicYearId },
      });
      return data;
    },
    enabled: !!studentId && !!academicYearId,
  });

  if (isLoading || !data?.stats) return null;

  const stats = data.stats;

  return (
    <Card className="rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Assiduité (année {data.academicYear?.label})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-slate-600">Absences totales</span>
            <span className="ml-auto font-semibold">{stats.absentDays}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-slate-600">Justifiées</span>
            <span className="ml-auto font-semibold">{stats.justifiedDays}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-slate-600">Non justifiées</span>
            <span className="ml-auto font-semibold">{stats.unjustifiedDays}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-slate-600">Retards</span>
            <span className="ml-auto font-semibold">{stats.lateDays}</span>
          </div>
          <div className="col-span-2 flex items-center gap-2 pt-2 border-t">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-slate-600">Taux de présence</span>
            <span className="ml-auto font-semibold text-blue-600">{stats.rate}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}