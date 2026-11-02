import { api } from "@/lib/axios";

export type TermType = "TRIMESTRE" | "SEMESTRE" | "MOIS";

export interface Term {
  id: string;
  academicYearId: string;
  name: string;
  type: TermType;
  startDate: string;
  endDate: string;
  orderIndex: number;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export const termsApi = {
  async list(academicYearId?: string): Promise<Term[]> {
    const params = academicYearId ? { academicYearId } : {};
    const { data } = await api.get("/terms", { params });
    return data.data || data;
  },

  async getById(id: string): Promise<Term> {
    const { data } = await api.get("/terms/" + id);
    return data.data || data;
  },

  async getCurrent(): Promise<Term | null> {
    const { data } = await api.get("/terms/current");
    return data.data || data;
  },
};
