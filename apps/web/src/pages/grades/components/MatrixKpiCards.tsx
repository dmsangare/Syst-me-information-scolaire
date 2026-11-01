import { Users, CheckCircle2, TrendingUp, Award } from "lucide-react";

interface MatrixKpiCardsProps {
  totalStudents: number;
  totalSubjects: number;
  totalCells: number;
  filledCells: number;
  classAverage: number | null;
  maxGrade: number | null;
  scale: number;
}

export function MatrixKpiCards({
  totalStudents,
  totalSubjects,
  totalCells,
  filledCells,
  classAverage,
  maxGrade,
  scale,
}: MatrixKpiCardsProps) {
  const progressPercent = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Carte 1 : Eleves (bleu) */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Eleves</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{totalStudents}</p>
            <p className="text-xs text-blue-600 mt-0.5">{totalSubjects} matiere(s)</p>
          </div>
        </div>
      </div>

      {/* Carte 2 : Progression (vert) */}
      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Saisie</p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{progressPercent}%</p>
            <p className="text-xs text-emerald-600 mt-0.5">{filledCells} / {totalCells} notes</p>
          </div>
        </div>
      </div>

      {/* Carte 3 : Moyenne classe (jaune) */}
      <div className="rounded-xl bg-amber-50 border border-amber-100 p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Moyenne classe</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">
              {classAverage !== null ? classAverage.toFixed(2) : "—"}
              <span className="text-sm font-normal text-amber-600 ml-1">/{scale}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Carte 4 : Note max (violet) */}
      <div className="rounded-xl bg-violet-50 border border-violet-100 p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-100 text-violet-600">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Meilleure note</p>
            <p className="text-2xl font-bold text-violet-900 mt-1">
              {maxGrade !== null ? maxGrade.toFixed(1) : "—"}
              <span className="text-sm font-normal text-violet-600 ml-1">/{scale}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
