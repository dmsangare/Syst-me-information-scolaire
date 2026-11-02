import { School, Calendar, ClipboardList } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Option { value: string; label: string; }

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
      {/* Classe */}
      <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <School className="h-4 w-4 text-blue-600" />
          Classe
        </label>
        <Select value={selectedClassId} onValueChange={onClassChange} disabled={disabled}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selectionner une classe" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Periode */}
      <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Calendar className="h-4 w-4 text-emerald-600" />
          Periode
        </label>
        <Select value={selectedTermId} onValueChange={onTermChange} disabled={disabled || !selectedClassId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selectionner une periode" />
          </SelectTrigger>
          <SelectContent>
            {terms.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-gray-500">Aucune periode disponible</div>
            ) : (
              terms.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Type */}
      <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <ClipboardList className="h-4 w-4 text-amber-600" />
          Type evaluation
        </label>
        <Select value={selectedAssessmentType} onValueChange={onAssessmentTypeChange} disabled={disabled}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selectionner un type" />
          </SelectTrigger>
          <SelectContent>
            {assessmentTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
