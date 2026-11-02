import { api } from "@/lib/axios";

export interface SubjectDomain {
  id: string;
  schoolId: string;
  code: string;
  name: string;
  description?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectDomainInput {
  code: string;
  name: string;
  description?: string;
  order?: number;
}

export const subjectDomainsApi = {
  async list(): Promise<SubjectDomain[]> {
    const { data } = await api.get("/subject-domains");
    return data.data || data;
  },

  async create(input: CreateSubjectDomainInput): Promise<SubjectDomain> {
    const { data } = await api.post("/subject-domains", input);
    return data.data || data;
  },

  async update(id: string, input: Partial<CreateSubjectDomainInput>): Promise<SubjectDomain> {
    const { data } = await api.patch("/subject-domains/" + id, input);
    return data.data || data;
  },

  async remove(id: string): Promise<void> {
    await api.delete("/subject-domains/" + id);
  },
};
