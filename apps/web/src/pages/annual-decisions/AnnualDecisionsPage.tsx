import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileText, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { SuggestionBadge } from "./components/SuggestionBadge";
import { useSuggestedDecision, useStudentsForClass } from "@/hooks/annual-decisions/useAnnualDecisions";
import { api } from "@/lib/axios";

interface StudentRow {
  studentId: string;
  studentName: string;
  matricule: string;
  currentDecision?: string;
}

function StudentDecisionRow({
  studentId,
  studentName,
  matricule,
  academicYearId,
  currentDecision,
}: StudentRow & { academicYearId: string }) {
  const { data: suggestion, isLoading } = useSuggestedDecision(studentId, academicYearId);

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="p-3 font-mono text-xs text-muted-foreground">{matricule}</td>
      <td className="p-3 font-medium">{studentName}</td>
      <td className="p-3 text-center">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
        ) : suggestion ? (
          <SuggestionBadge
            decision={suggestion.suggestedDecision}
            annualAverage={suggestion.annualAverage}
            passingScore={suggestion.passingScore}
            scale={suggestion.scale}
          />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>
      <td className="p-3 text-center">
        <span className="text-xs font-medium">{currentDecision || "—"}</span>
      </td>
      <td className="p-3 text-xs text-muted-foreground">
        {suggestion?.reason || "—"}
      </td>
    </tr>
  );
}

export function AnnualDecisionsPage() {
  const [classId, setClassId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");

  const { data: classes } = useQuery({
    queryKey: ["classes", "list"],
    queryFn: async () => {
      const { data } = await api.get("/classes");
      return data.data || data;
    },
  });

  const { data: academicYears } = useQuery({
    queryKey: ["academic-years", "list"],
    queryFn: async () => {
      const { data } = await api.get("/academic-years");
      return data.data || data;
    },
  });

  const { data: students, isLoading: loadingStudents } = useStudentsForClass(classId, academicYearId);

  const studentRows: StudentRow[] = (students || []).map((s) => ({
    studentId: s.studentId,
    studentName: s.studentName,
    matricule: s.matricule,
  }));

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-sis-md bg-sis-brand-50 text-sis-brand dark:bg-sis-brand-900/30 dark:text-sis-brand-300">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Décisions annuelles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suggestions automatiques basées sur la moyenne annuelle (règle malienne)
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Classe</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">-- Sélectionner --</option>
                {classes?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Année scolaire</label>
              <select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">-- Sélectionner --</option>
                {academicYears?.map((y: any) => (
                  <option key={y.id} value={y.id}>
                    {y.label} {y.isCurrent ? "(en cours)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!classId || !academicYearId ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
            <p className="font-medium">Sélectionnez une classe et une année</p>
            <p className="text-sm text-muted-foreground mt-1">
              Les suggestions de décision apparaîtront ici
            </p>
          </CardContent>
        </Card>
      ) : loadingStudents ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : studentRows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
            <p className="font-medium">Aucun élève dans cette classe</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="text-left p-3 font-medium">Matricule</th>
                  <th className="text-left p-3 font-medium">Élève</th>
                  <th className="text-center p-3 font-medium">Suggestion système</th>
                  <th className="text-center p-3 font-medium">Décision actuelle</th>
                  <th className="text-left p-3 font-medium">Détail</th>
                </tr>
              </thead>
              <tbody>
                {studentRows.map((s) => (
                  <StudentDecisionRow
                    key={s.studentId}
                    {...s}
                    academicYearId={academicYearId}
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}