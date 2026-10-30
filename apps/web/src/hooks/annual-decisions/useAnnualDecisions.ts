import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface SuggestedDecision {
  studentId: string;
  studentName: string;
  matricule: string;
  className: string;
  cycle: string;
  scale: number;
  annualAverage: number | null;
  passingScore: number;
  suggestedDecision: "ADMIS" | "REDOUBLE" | "A_EXAMINER" | "INCOMPLET";
  reason: string;
  complete: boolean;
  periodsCount: number;
  periodsAvailable: number;
}

export function useSuggestedDecision(
  studentId: string | undefined,
  academicYearId: string | undefined,
) {
  return useQuery({
    queryKey: ["annual-decisions", "suggest", studentId, academicYearId],
    queryFn: async () => {
      const { data } = await api.get(
        `/annual-decisions/suggest/${studentId}/${academicYearId}`,
      );
      return (data.data || data) as SuggestedDecision;
    },
    enabled: !!studentId && !!academicYearId,
    staleTime: 2 * 60_000,
  });
}

export interface StudentFromEnrollment {
  studentId: string;
  studentName: string;
  matricule: string;
}

export function useStudentsForClass(
  classId: string | undefined,
  academicYearId: string | undefined,
) {
  return useQuery({
    queryKey: ["enrollments", classId, academicYearId],
    queryFn: async () => {
      const { data } = await api.get("/enrollments", {
        params: {
          classId,
          academicYearId,
          status: "VALIDATED",
          limit: 200,
        },
      });
      const list = data.data || data;
      return (Array.isArray(list) ? list : []).map((e: any) => ({
        studentId: e.studentId,
        studentName: e.student ? `${e.student.lastName} ${e.student.firstName}` : "—",
        matricule: e.student?.matricule || "—",
      })) as StudentFromEnrollment[];
    },
    enabled: !!classId && !!academicYearId,
  });
}