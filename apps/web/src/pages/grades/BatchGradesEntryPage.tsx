import { useState, useEffect, useMemo } from "react";
import { MatrixKpiCards } from "./components/MatrixKpiCards";
import { MatrixFilters } from "./components/MatrixFilters";
import { MatrixTable } from "./components/MatrixTable";
import { MatrixMobileCards } from "./components/MatrixMobileCards";
import { MatrixActionBar } from "./components/MatrixActionBar";
import { useMatrix, useSaveBatchMatrix } from "@/hooks/grades/useBatchGrades";
import { useClasses } from "@/hooks/classes/useClasses";
import { useTerms } from "@/hooks/terms/useTerms";
import type { BatchMatrixEntry } from "@/types/grades";

const ASSESSMENT_TYPES = [
  { value: "COMPOSITION", label: "Composition" },
  { value: "DEVOIR", label: "Devoir" },
  { value: "INTERROGATION", label: "Interrogation" },
  { value: "CONTROLE", label: "Controle" },
];

export function BatchGradesEntryPage() {
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [assessmentType, setAssessmentType] = useState("COMPOSITION");
  const [values, setValues] = useState<Record<string, string>>({});
  const [absences, setAbsences] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: matrix, isLoading, error, refetch } = useMatrix(
    classId || undefined,
    termId || undefined,
    assessmentType || undefined,
  );

  const saveMutation = useSaveBatchMatrix();

  const { data: classesRaw } = useClasses({ page: 1, limit: 200 } as any);

  const selectedClass = useMemo(() => {
    const list = Array.isArray(classesRaw) ? classesRaw : [];
    return list.find((c: any) => c.id === classId);
  }, [classesRaw, classId]);

  const academicYearId = selectedClass?.academicYearId;
  const { data: termsRaw } = useTerms(academicYearId);

  const classOptions = useMemo(() => {
    const list = Array.isArray(classesRaw) ? classesRaw : [];
    return list.map((c: any) => ({
      value: c.id,
      label: c.code + " - " + c.name,
    }));
  }, [classesRaw]);

  const termOptions = useMemo(() => {
    const list = Array.isArray(termsRaw) ? termsRaw : [];
    return list.map((t: any) => ({
      value: t.id,
      label: t.name + (t.isLocked ? " (verrouillee)" : ""),
    }));
  }, [termsRaw]);

  useEffect(() => {
    setValues({});
    setAbsences({});
    setHasChanges(false);
  }, [matrix?.class?.id, matrix?.term?.id, assessmentType]);

  const handleValueChange = (studentId: string, subjectId: string, value: string) => {
    const key = studentId + ":" + subjectId;
    setValues((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleToggleAbsent = (studentId: string, subjectId: string) => {
    const key = studentId + ":" + subjectId;
    setAbsences((prev) => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const handleCancel = () => {
    setValues({});
    setAbsences({});
    setHasChanges(false);
  };

  const handleSave = async () => {
    if (!matrix) return;
    const entries: BatchMatrixEntry[] = [];
    for (const student of matrix.matrix) {
      for (const subject of matrix.subjects) {
        const key = student.studentId + ":" + subject.id;
        const isAbsent = absences[key] || false;
        const rawValue = values[key];
        if (rawValue === undefined && !isAbsent) continue;
        let parsedValue: number | null = null;
        if (rawValue !== undefined && rawValue !== "") {
          const num = parseFloat(rawValue);
          parsedValue = isNaN(num) ? null : num;
        }
        entries.push({
          studentId: student.studentId,
          subjectId: subject.id,
          value: parsedValue,
          isAbsent,
          isExempt: false,
          observation: null,
        });
      }
    }
    if (entries.length === 0) return;
    await saveMutation.mutateAsync({
      classId: matrix.class.id,
      termId: matrix.term.id,
      assessmentType,
      entries,
      overwrite: true,
    });
    setHasChanges(false);
    setValues({});
    setAbsences({});
    refetch();
  };

  const kpi = useMemo(() => {
    if (!matrix) return { filled: 0, total: 0, average: null, max: null };
    let filled = 0;
    let total = 0;
    let sum = 0;
    let count = 0;
    let max: number | null = null;
    for (const student of matrix.matrix) {
      for (const subject of matrix.subjects) {
        total++;
        const key = student.studentId + ":" + subject.id;
        if (absences[key]) continue;
        const raw = values[key] !== undefined
          ? values[key]
          : (student.cells.find((c) => c.subjectId === subject.id)?.value?.toString() ?? "");
        if (raw === "") continue;
        const num = parseFloat(raw);
        if (isNaN(num)) continue;
        filled++;
        sum += num;
        count++;
        if (max === null || num > max) max = num;
      }
    }
    return { filled, total, average: count > 0 ? sum / count : null, max };
  }, [matrix, values, absences]);

  const ready = !!classId && !!termId && !!assessmentType;

  return (
    <div className="p-4 md:p-6 space-y-6 pb-32">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Saisie groupee des notes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Saisissez les notes de plusieurs matieres pour toute la classe en une seule operation.
        </p>
      </div>

      {/* Filtres */}
      <MatrixFilters
        classes={classOptions}
        terms={termOptions}
        assessmentTypes={ASSESSMENT_TYPES}
        selectedClassId={classId}
        selectedTermId={termId}
        selectedAssessmentType={assessmentType}
        onClassChange={(v) => { setClassId(v); setTermId(""); }}
        onTermChange={setTermId}
        onAssessmentTypeChange={setAssessmentType}
      />

      {/* Message d attente */}
      {!ready && (
        <div className="rounded-xl bg-white border border-gray-200 p-12 text-center">
          <p className="text-lg font-semibold text-gray-900">Selectionnez une classe et une periode</p>
          <p className="text-sm text-gray-500 mt-2">
            Choisissez la classe, la periode et le type d evaluation pour afficher la matrice.
          </p>
        </div>
      )}

      {/* Chargement */}
      {ready && isLoading && (
        <div className="rounded-xl bg-white border border-gray-200 p-12 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm text-gray-500 mt-3">Chargement de la matrice...</p>
        </div>
      )}

      {/* Erreur */}
      {ready && error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6">
          <p className="font-semibold text-red-900">Erreur de chargement</p>
          <p className="text-sm text-red-700 mt-1">{(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            Reessayer
          </button>
        </div>
      )}

      {/* Matrice */}
      {ready && matrix && (
        <>
          {/* KPI Cards */}
          <MatrixKpiCards
            totalStudents={matrix.stats.totalStudents}
            totalSubjects={matrix.stats.totalSubjects}
            totalCells={matrix.stats.totalCells}
            filledCells={kpi.filled}
            classAverage={kpi.average}
            maxGrade={kpi.max}
            scale={matrix.scale}
          />

          {/* Vue desktop */}
          <div className="hidden md:block">
            <MatrixTable
              subjects={matrix.subjects}
              students={matrix.matrix}
              scale={matrix.scale}
              values={values}
              absences={absences}
              onValueChange={handleValueChange}
              onToggleAbsent={handleToggleAbsent}
              disabled={matrix.term.isLocked}
            />
          </div>

          {/* Vue mobile */}
          <div className="md:hidden">
            <MatrixMobileCards
              subjects={matrix.subjects}
              students={matrix.matrix}
              scale={matrix.scale}
              values={values}
              absences={absences}
              onValueChange={handleValueChange}
              onToggleAbsent={handleToggleAbsent}
              disabled={matrix.term.isLocked}
            />
          </div>

          {/* Barre d action flottante */}
          <MatrixActionBar
            filledCells={kpi.filled}
            totalCells={kpi.total}
            isSaving={saveMutation.isPending}
            hasChanges={hasChanges}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </>
      )}
    </div>
  );
}
