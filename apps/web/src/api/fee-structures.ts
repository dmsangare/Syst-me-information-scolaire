import { api } from "@/lib/axios";
import type { FeeStructure, CreateFeeStructureInput, FeeCoverage } from "@/types/finance";

export interface FeeStructureFilters {
  academicYearId?: string;
  levelId?: string;
  feeTypeId?: string;
}

export const feeStructuresApi = {
  async list(filters: FeeStructureFilters = {}): Promise<FeeStructure[]> {
    const { data } = await api.get("/fee-structures", { params: filters });
    return data.data || data;
  },

  async getByLevel(levelId: string): Promise<FeeStructure[]> {
    const { data } = await api.get(`/fee-structures/level/${levelId}`);
    return data.data || data;
  },

  async getById(id: string): Promise<FeeStructure> {
    const { data } = await api.get(`/fee-structures/${id}`);
    return data.data || data;
  },

  async create(input: CreateFeeStructureInput): Promise<FeeStructure> {
    const { data } = await api.post("/fee-structures", input);
    return data.data || data;
  },

  async update(id: string, input: Partial<CreateFeeStructureInput>): Promise<FeeStructure> {
    const { data } = await api.patch(`/fee-structures/${id}`, input);
    return data.data || data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/fee-structures/${id}`);
  },

  async getCoverage(yearId: string): Promise<FeeCoverage> {
    const { data } = await api.get(`/fee-structures/coverage/${yearId}`);
    return data;
  },
};
