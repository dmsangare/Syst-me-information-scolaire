import { GradeInput } from "@/pages/assessments/components/GradeInput";
import { cn } from "@/lib/utils";
import { UserX } from "lucide-react";
import type { MatrixStudent, MatrixSubject } from "@/types/grades";

interface MatrixMobileCardsProps {
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

export function MatrixMobileCards({
  subjects,
  students,
  scale,
  values,
  absences,
  onValueChange,
  onToggleAbsent,
  disabled = false,
}: MatrixMobileCardsProps) {
  return (
    <div className="space-y-4">
      {students.map((student) => (
        <div
          key={student.studentId}
          className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden"
        >
          {/* Header eleve */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 border-b border-gray-200">
            <div
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
                student.gender === "F"
                  ? "bg-pink-100 text-pink-700"
                  : "bg-blue-100 text-blue-700",
              )}
            >
              {studentInitials(student.firstName, student.lastName)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {student.lastName} {student.firstName}
              </p>
              <p className="text-xs text-gray-500">{student.matricule}</p>
            </div>
          </div>

          {/* Liste des matieres */}
          <div className="divide-y divide-gray-100">
            {subjects.map((subj) => {
              const key = student.studentId + ":" + subj.id;
              const isAbsent = absences[key] || false;
              const cell = student.cells.find((c) => c.subjectId === subj.id);
              const currentValue = values[key] !== undefined
                ? values[key]
                : (cell?.value?.toString() ?? "");
              return (
                <div key={subj.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{subj.name}</p>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium inline-block mt-0.5",
                        subj.isMandatory
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500",
                      )}
                    >
                      {subj.isMandatory ? "Obligatoire" : "Facultatif"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <GradeInput
                      value={isAbsent ? "" : currentValue}
                      maxScore={scale}
                      disabled={disabled || isAbsent}
                      onChange={(v) => onValueChange(student.studentId, subj.id, v)}
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
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
