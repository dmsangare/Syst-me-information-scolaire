import { useRef } from "react";
import { cn } from "@/lib/utils";
import { GradeInput } from "./GradeInput";

interface StudentRow {
  studentId: string;
  student: {
    id: string;
    matricule: string;
    firstName: string;
    lastName: string;
    gender: "M" | "F";
  };
  grade: {
    id: string;
    value: number | null;
    isAbsent: boolean;
    observation?: string | null;
    locked: boolean;
  } | null;
}

interface GradesGridProps {
  students: StudentRow[];
  values: Record<string, string>;
  absences: Record<string, boolean>;
  observations: Record<string, string>;
  ranks: Record<string, number>;
  maxScore: number;
  disabled: boolean;
  onChangeValue: (studentId: string, value: string) => void;
  onToggleAbsent: (studentId: string) => void;
  onChangeObservation: (studentId: string, value: string) => void;
}

export function GradesGrid({
  students,
  values,
  absences,
  observations,
  ranks,
  maxScore,
  disabled,
  onChangeValue,
  onToggleAbsent,
  onChangeObservation,
}: GradesGridProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement>>({});

  const focusCell = (row: number, col: "note" | "observation") => {
    const key = `${row}-${col}`;
    const input = inputRefs.current[key];
    if (input) input.focus();
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    col: "note" | "observation",
  ) => {
    const key = e.key;

    if (key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      if (col === "note") focusCell(rowIndex, "observation");
      else if (rowIndex < students.length - 1) focusCell(rowIndex + 1, "note");
    }

    if (key === "Tab" && e.shiftKey) {
      e.preventDefault();
      if (col === "observation") focusCell(rowIndex, "note");
      else if (rowIndex > 0) focusCell(rowIndex - 1, "observation");
    }

    if (key === "Enter" || key === "ArrowDown") {
      e.preventDefault();
      if (col === "note") {
        if (rowIndex < students.length - 1) focusCell(rowIndex + 1, "note");
      } else {
        if (rowIndex < students.length - 1) focusCell(rowIndex + 1, col);
      }
    }

    if (key === "ArrowUp") {
      e.preventDefault();
      if (rowIndex > 0) focusCell(rowIndex - 1, col);
    }

    if (key === "ArrowLeft") {
      const input = e.currentTarget;
      if (input.selectionStart === 0) {
        if (col === "observation") focusCell(rowIndex, "note");
      }
    }
    if (key === "ArrowRight") {
      const input = e.currentTarget;
      if (input.selectionStart === input.value.length) {
        if (col === "note") focusCell(rowIndex, "observation");
      }
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="text-center p-2 font-medium w-12">N°</th>
            <th className="text-left p-2 font-medium w-32">Matricule</th>
            <th className="text-left p-2 font-medium">Nom & Prénom</th>
            <th className="text-center p-2 font-medium w-24">Note /{maxScore}</th>
            <th className="text-center p-2 font-medium w-20">Rang</th>
            <th className="text-center p-2 font-medium w-24">Absent</th>
            <th className="text-left p-2 font-medium w-48">Observation</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, idx) => {
            const isAbsent = absences[s.studentId] || false;
            const isLocked = s.grade?.locked || disabled;
            
            // ✅ Détection visuelle : note vide, zéro, ou renseignée
            const valueStr = values[s.studentId] || "";
            const hasValue = valueStr !== "";
            const isZero = valueStr === "0";
            const isMissing = !hasValue && !isAbsent;

            return (
              <tr
                key={s.studentId}
                className={cn(
                  "border-b last:border-0 transition-colors",
                  isAbsent
                    ? "bg-orange-50/60 dark:bg-orange-950/20 opacity-75"
                    : isMissing
                      ? "bg-red-50/30 dark:bg-red-950/10" // Légèrement rouge si vide
                      : "hover:bg-muted/30",
                )}
              >
                <td className="p-2 text-center text-muted-foreground font-mono text-xs">
                  {idx + 1}
                </td>
                <td className="p-2 font-mono text-xs text-muted-foreground">
                  {s.student.matricule}
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-semibold shrink-0",
                        s.student.gender === "M"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-pink-100 text-pink-700",
                      )}
                    >
                      {s.student.firstName[0]}
                      {s.student.lastName[0]}
                    </span>
                    <span className="font-medium truncate">
                      {s.student.lastName} {s.student.firstName}
                    </span>
                  </div>
                </td>
                <td className="p-2 relative">
                  <GradeInput
                    value={valueStr}
                    maxScore={maxScore}
                    disabled={isLocked || isAbsent}
                    onChange={(v) => onChangeValue(s.studentId, v)}
                    onKeyDown={(e) => handleKeyDown(e, idx, "note")}
                    inputRef={(el) => {
                      if (el) inputRefs.current[`${idx}-note`] = el;
                    }}
                  />
                  {/* ✅ Indicateur visuel de note manquante */}
                  {isMissing && (
                    <span className="absolute -bottom-1 left-0 right-0 text-[9px] text-center text-red-500 font-medium">
                      À saisir
                    </span>
                  )}
                  {isZero && (
                    <span className="absolute -bottom-1 left-0 right-0 text-[9px] text-center text-muted-foreground">
                      Zéro
                    </span>
                  )}
                </td>
                <td className="p-2 text-center">
                  {ranks[s.studentId] ? (
                    <RankBadge rank={ranks[s.studentId]} />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={isAbsent}
                    disabled={isLocked}
                    onChange={() => onToggleAbsent(s.studentId)}
                    className="h-4 w-4 accent-orange-500 cursor-pointer"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={observations[s.studentId] || ""}
                    disabled={isLocked || isAbsent}
                    onChange={(e) =>
                      onChangeObservation(s.studentId, e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, idx, "observation")}
                    ref={(el) => {
                      if (el) inputRefs.current[`${idx}-observation`] = el;
                    }}
                    placeholder="—"
                    className={cn(
                      "w-full h-10 px-2 text-sm rounded-md border border-input bg-background",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                      (isLocked || isAbsent) && "opacity-60 cursor-not-allowed bg-muted",
                    )}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const medals = ["🥇", "🥈", "🥉"];
  const medal = rank <= 3 ? medals[rank - 1] : null;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
        rank === 1 && "bg-yellow-100 text-yellow-800",
        rank === 2 && "bg-gray-100 text-gray-700",
        rank === 3 && "bg-orange-100 text-orange-700",
        rank > 3 && "bg-muted text-muted-foreground",
      )}
    >
      {medal && <span>{medal}</span>}
      <span>{rank}</span>
    </span>
  );
}