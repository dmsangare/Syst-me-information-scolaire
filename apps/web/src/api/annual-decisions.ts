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

export const annualDecisionsApi = {
  async suggest(studentId: string, academicYearId: string): Promise<SuggestedDecision> {
    const { data } = await api.get(`/annual-decisions/suggest/${studentId}/${academicYearId}`);
    return data.data || data;
  },
};