import { api } from "@/lib/axios";
import type { CampaignItem, CreateCampaignInput, CampaignListFilters } from "@/types/campaign";

export const campaignsApi = {
  async list(filters: CampaignListFilters = {}): Promise<CampaignItem[]> {
    const { data } = await api.get("/campaigns", { params: filters });
    return data.data || data;
  },
  async getById(id: string): Promise<any> {
    const { data } = await api.get(`/campaigns/${id}`);
    return data.data || data;
  },
  async create(input: CreateCampaignInput): Promise<{ created: number; skipped: number; campaigns: CampaignItem[] }> {
    const { data } = await api.post("/campaigns", input);
    return data;
  },
  async activate(id: string): Promise<CampaignItem> {
    const { data } = await api.post(`/campaigns/${id}/activate`);
    return data;
  },
  async validate(id: string): Promise<CampaignItem> {
    const { data } = await api.post(`/campaigns/${id}/validate`);
    return data;
  },
  async getMySubjects(id: string): Promise<any> {
    const { data } = await api.get(`/campaigns/${id}/my-subjects`);
    return data;
  },
  async saveGrades(id: string, assessmentId: string, grades: any[]): Promise<any> {
    const { data } = await api.patch(`/campaigns/${id}/assessments/${assessmentId}/grades`, { grades });
    return data;
  },
  async validateTeacher(id: string, subjectId: string): Promise<any> {
    const { data } = await api.post(`/campaigns/${id}/validate-teacher`, { subjectId });
    return data;
  },
  async getResults(id: string): Promise<any> {
    const { data } = await api.get(`/campaigns/${id}/results`);
    return data;
  },
};