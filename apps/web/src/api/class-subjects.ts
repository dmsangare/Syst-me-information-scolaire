import { api } from "@/lib/axios";
import type {
  ClassSubject,
  ClassSubjectListFilters,
  CreateClassSubjectInput,
  UpdateClassSubjectInput,
  BulkCreateClassSubjectInput,
  ReorderClassSubjectInput,
} from "@/types/class-subject";

export const classSubjectsApi = {
  async list(filters: ClassSubjectListFilters = {}): Promise<ClassSubject[]> {
    const { data } = await api.get("/class-subjects", { params: filters });
    return data.data || data;
  },

  async getById(id: string): Promise<ClassSubject> {
    const { data } = await api.get("/class-subjects/" + id);
    return data.data || data;
  },

  async create(input: CreateClassSubjectInput): Promise<ClassSubject> {
    const { data } = await api.post("/class-subjects", input);
    return data.data || data;
  },

  async bulkCreate(input: BulkCreateClassSubjectInput): Promise<ClassSubject[]> {
    const { data } = await api.post("/class-subjects/bulk", input);
    return data.data || data;
  },

  async reorder(input: ReorderClassSubjectInput): Promise<void> {
    await api.patch("/class-subjects/reorder", input);
  },

  async update(id: string, input: UpdateClassSubjectInput): Promise<ClassSubject> {
    const { data } = await api.patch("/class-subjects/" + id, input);
    return data.data || data;
  },

  async remove(id: string): Promise<void> {
    await api.delete("/class-subjects/" + id);
  },
};
