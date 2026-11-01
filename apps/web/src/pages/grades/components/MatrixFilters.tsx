import { School, Calendar, ClipboardList } from "lucide-react";
import { Select } from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
}

interface MatrixFiltersProps {
  classes: Option[];
  terms: Option[];
  assessmentTypes: Option[];
  selectedClassId: string;
  selectedTermId: string;
  selectedAssessmentType: string;
  onClassChange: (value: string) => void;
  onTermChange: (value: string) => void;
  onAssessmentTypeChange: (value: string) => void;
  disabled?: boolean;
}

export function MatrixFilters({
  classes,
  terms,
  assessmentTypes,
  selectedClassId,
  selectedTermId,
  selectedAssessmentType,
  onClassChange,
  onTermChange,
  onAssessmentTypeChange,
  disabled = false,
}: MatrixFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Filtre Classe */}
      <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <School className="h-4 w-4 text-blue-600" />
          Classe
        </label>
        <Select
          value={selectedClassId}
          onValueChange={onClassChange}
          disabled={disabled}
        >
          <option value="">-- Selectionner une classe --</option>
          {classes.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
      </div>

      {/* Filtre Periode */}
      <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Calendar className="h-4 w-4 text-emerald-600" />
          Periode
        </label>
        <Select
          value={selectedTermId}
          onValueChange={onTermChange}
          disabled={disabled || !selectedClassId}
        >
          <option value="">-- Selectionner une periode --</option>
          {terms.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
      </div>

      {/* Filtre Type */}
      <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <ClipboardList className="h-4 w-4 text-amber-600" />
          Type evaluation
        </label>
        <Select
          value={selectedAssessmentType}
          onValueChange={onAssessmentTypeChange}
          disabled={disabled}
        >
          <option value="">-- Selectionner un type --</option>
          {assessmentTypes.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
      </div>
    </div>
  );
}
