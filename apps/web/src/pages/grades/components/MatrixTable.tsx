import { useMemo } from "react";
import { GradeInput } from "@/pages/assessments/components/GradeInput";
import { cn } from "@/lib/utils";
import { UserX } from "lucide-react";
import type { MatrixStudent, MatrixSubject, MatrixCell } from "@/types/grades";

interface MatrixTableProps {
  subjects: MatrixSubject[];
  students: MatrixStudent[];
  scale: number;
  values: Record<string, string>;
  absences: Record<string, boolean>;
  onValueChange: (studentId: string, subjectId: string, value: string) => void;
  onToggleAbsent: (studentId: string, subjectId: string) => void;
  disabled?: boolean;
}

function studentInitials(firstName: string, lastName: string): string {
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
}

function studentFullName(firstName: string, lastName: string): string {
  return lastName + " " + firstName;
}

export function MatrixTable({
  subjects,
  students,
  scale,
  values,
  absences,
  onValueChange,
  onToggleAbsent,
  disabled = false,
}: MatrixTableProps) {
  // Calcul des moyennes par eleve (uniquement pour affichage rapide)
  const averagesByStudent = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const student of students) {
      let sum = 0;
      let count = 0;
      for (const cell of student.cells) {
        const key = student.studentId + ":" + cell.subjectId;
        if (absences[key]) continue;
        const raw = values[key];
        if (raw !== undefined && raw !== "") {
          const num = parseFloat(raw);
          if (!isNaN(num)) {
            sum += num;
            count++;
          }
        } else if (cell.value !== null) {
          sum += cell.value;
          count++;
        }
      }
      map[student.studentId] = count > 0 ? sum / count : null;
    }
    return map;
  }, [students, values, absences]);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[800px] text-sm">
        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50 z-20 min-w-[220px]">
              Eleve
            </th>
            {subjects.map((subj) => (
              <th key={subj.id} className="text-center px-2 py-3 font-semibold text-gray-700 min-w-[100px]">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs">{subj.name}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-medium",
                      subj.isMandatory
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {subj.isMandatory ? "Obligatoire" : "Facultatif"}
                  </span>
                </div>
              </th>
            ))}
            <th className="text-center px-3 py-3 font-semibold text-gray-700 bg-gray-100 min-w-[80px]">
              Moyenne
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, idx) => {
            const isEven = idx % 2 === 0;
            const average = averagesByStudent[student.studentId];
            return (
              <tr
                key={student.studentId}
                className={cn(
                  "border-b border-gray-100 hover:bg-blue-50/30 transition-colors",
                  isEven ? "bg-white" : "bg-gray-50/30",
                )}
              >
                <td className="px-4 py-2 sticky left-0 bg-inherit z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                        student.gender === "F"
                          ? "bg-pink-100 text-pink-700"
                          : "bg-blue-100 text-blue-700",
                      )}
                    >
                      {studentInitials(student.firstName, student.lastName)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {studentFullName(student.firstName, student.lastName)}
                      </p>
                      <p className="text-xs text-gray-500">{student.matricule}</p>
                    </div>
                  </div>
                </td>
                {subjects.map((subj) => {
                  const key = student.studentId + ":" + subj.id;
                  const isAbsent = absences[key] || false;
                  const currentValue = values[key] !== undefined
                    ? values[key]
                    : (student.cells.find((c) => c.subjectId === subj.id)?.value?.toString() ?? "");
                  return (
                    <td key={subj.id} className="px-1 py-2">
                      <div className="flex items-center gap-1">
                        <GradeInput
                          value={isAbsent ? "" : currentValue}
                          maxScore={scale}
                          disabled={disabled || isAbsent}
                          onChange={(v) => onValueChange(student.studentId, subj.id, v)}
                          data-row={idx}
                        />
                        <button
                          type="button"
                          onClick={() => onToggleAbsent(student.studentId, subj.id)}
                          disabled={disabled}
                          className={cn(
                            "h-8 w-8 rounded-md flex items-center justify-center transition-colors shrink-0",
                            isAbsent
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200",
                          )}
                          title={isAbsent ? "Retirer absence" : "Marquer absent"}
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center bg-gray-50/50">
                  <span className="font-semibold text-gray-900">
                    {average !== null ? average.toFixed(2) : "—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
