import { api } from "@/lib/axios";
import type { AssessmentGrades, GradeEntry } from "@/types/grades";

export const gradesApi = {
  async findByAssessment(assessmentId: string): Promise<AssessmentGrades> {
    const { data } = await api.get(`/grades/assessment/${assessmentId}`);
    return data.data || data;
  },

  async getStats(assessmentId: string): Promise<any> {
    const { data } = await api.get(`/grades/assessment/${assessmentId}/stats`);
    return data.data || data;
  },

  async bulkEntry(assessmentId: string, grades: GradeEntry[]): Promise<any> {
    const { data } = await api.post("/grades/bulk", { assessmentId, grades });
    return data.data || data;
  },

  async update(id: string, dto: any): Promise<any> {
    const { data } = await api.patch(`/grades/${id}`, dto);
    return data.data || data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/grades/${id}`);
  },
  // ============================================================
  // SAISIE GROUPEE (MATRICE)
  // ============================================================

  async getMatrix(
    classId: string,
    termId: string,
    assessmentType: string,
  ): Promise<any> {
    const params = new URLSearchParams({ classId, termId, assessmentType });
    const { data } = await api.get("/grades/matrix?" + params.toString());
    return data.data || data;
  },

  async saveBatchMatrix(payload: {
    classId: string;
    termId: string;
    assessmentType: string;
    entries: Array<{
      studentId: string;
      subjectId: string;
      value: number | null;
      isAbsent: boolean;
      isExempt: boolean;
      observation?: string | null;
    }>;
    overwrite: boolean;
  }): Promise<{
    created: number;
    updated: number;
    skipped: number;
    conflicts: Array<{ studentId: string; subjectId: string; currentValue: number }>;
    totalProcessed: number;
    termName: string;
    scale: number;
  }> {
    const { data } = await api.post("/grades/batch-matrix", payload);
    return data.data || data;
  },
};
