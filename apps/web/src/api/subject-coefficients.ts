import { api } from "@/lib/axios";
import type { SubjectCoefficient, SetCoefficientInput } from "@/types/subject-coefficient";

export const subjectCoefficientsApi = {
  async listBySubject(subjectId: string): Promise<SubjectCoefficient[]> {
    const { data } = await api.get("/subjects/" + subjectId + "/coefficients");
    return data.data || data;
  },

  async set(subjectId: string, input: SetCoefficientInput): Promise<SubjectCoefficient> {
    const { data } = await api.post("/subjects/" + subjectId + "/coefficients", input);
    return data.data || data;
  },

  async remove(subjectId: string, levelId: string, academicYearId: string): Promise<void> {
    await api.delete("/subjects/" + subjectId + "/coefficients/" + levelId, {
      params: { academicYearId },
    });
  },
};
