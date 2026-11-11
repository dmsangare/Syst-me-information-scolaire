import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useFeeCoverage } from "@/hooks/finance/useFeeStructures";

interface CoverageWarningProps {
  academicYearId?: string;
}

export function CoverageWarning({ academicYearId }: CoverageWarningProps) {
  const { data, isLoading } = useFeeCoverage(academicYearId);

  if (isLoading || !data || data.isReadyForBulk) return null;

  const { levelsMissingGrid, totalStudentsAffected } = data;
  if (levelsMissingGrid.length === 0) return null;

  return (
    <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900">
            Configuration incomplète
          </h3>
          <p className="text-sm text-yellow-800 mt-1">
            {levelsMissingGrid.length} niveau{levelsMissingGrid.length > 1 ? "x" : ""} sans
            grille tarifaire ({totalStudentsAffected} élève{totalStudentsAffected > 1 ? "s" : ""})
            — ces élèves ne seront pas facturés automatiquement.
          </p>
          <ul className="mt-2 text-sm text-yellow-800 list-disc list-inside space-y-0.5">
            {levelsMissingGrid.map((lvl) => (
              <li key={lvl.id}>
                <strong>{lvl.code}</strong> ({lvl.name}) — {lvl.studentsCount} élève
                {lvl.studentsCount > 1 ? "s" : ""}
              </li>
            ))}
          </ul>
          <Link
            to="/finance/fee-structures"
            className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-yellow-900 hover:underline"
          >
            Configurer maintenant
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
