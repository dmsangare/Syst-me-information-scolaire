import { TrendingUp, TrendingDown, Minus, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui";

interface GradesStatsProps {
  values: Record<string, string>;
  maxScore: number;
  totalStudents: number;
}

export function GradesStats({ values, maxScore, totalStudents }: GradesStatsProps) {
  // Filtrer les notes valides
  const validGrades = Object.values(values)
    .map((v) => parseFloat(v))
    .filter((v) => !isNaN(v) && v >= 0 && v <= maxScore);

  const count = validGrades.length;
  const average =
    count > 0
      ? validGrades.reduce((sum, v) => sum + v, 0) / count
      : 0;
  const min = count > 0 ? Math.min(...validGrades) : 0;
  const max = count > 0 ? Math.max(...validGrades) : 0;

  const averageOutOf20 = maxScore === 10 ? average * 2 : average;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        label="Notes saisies"
        value={`${count}/${totalStudents}`}
        icon={<Users className="h-4 w-4" />}
        color={count === totalStudents ? "green" : "blue"}
      />
      <StatCard
        label="Moyenne"
        value={count > 0 ? average.toFixed(2) : "—"}
        subtitle={
          count > 0 && maxScore === 10
            ? `(${averageOutOf20.toFixed(2)}/20)`
            : `sur ${maxScore}`
        }
        icon={<TrendingUp className="h-4 w-4" />}
        color="blue"
      />
      <StatCard
        label="Note minimale"
        value={count > 0 ? min.toFixed(1) : "—"}
        icon={<TrendingDown className="h-4 w-4" />}
        color="orange"
      />
      <StatCard
        label="Note maximale"
        value={count > 0 ? max.toFixed(1) : "—"}
        icon={<TrendingUp className="h-4 w-4" />}
        color="green"
      />
    </div>
  );
}

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
  color: "blue" | "green" | "orange";
}) {
  const colors = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    orange: "text-orange-600 dark:text-orange-400",
  };
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span className={colors[color]}>{icon}</span>
          {label}
        </div>
        <div className="text-xl font-bold">{value}</div>
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}