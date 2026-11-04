import { api } from "@/lib/axios";
import type { Teacher, CreateTeacherInput, TeacherSpecialty } from "@/types/teacher";

export interface TeacherListFilters {
  page?: number;
  limit?: number;
  q?: string;
  teacherType?: "GENERALIST" | "SPECIALIST";
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

export interface TeacherListResponse {
  data: Teacher[];
  meta: { page: number; limit: number; total: number; pages: number };
}

export const teachersApi = {
  list: async (params?: TeacherListFilters): Promise<TeacherListResponse> => {
    const res = await api.get('/teachers', { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/teachers/${id}`);
    return res.data?.data ?? res.data;
  },
  create: async (input: CreateTeacherInput) => {
    const res = await api.post('/teachers', input);
    return res.data?.data ?? res.data;
  },
  update: async (id: string, dto: any) => {
    const res = await api.patch(`/teachers/${id}`, dto);
    return res.data?.data ?? res.data;
  },
  remove: async (id: string) => {
    const res = await api.delete(`/teachers/${id}`);
    return res.data?.data ?? res.data;
  },
  assign: async (id: string, dto: any) => {
    const res = await api.post(`/teachers/${id}/assign`, dto);
    return res.data?.data ?? res.data;
  },
  removeAssignment: async (id: string, assignmentId: string) => {
    const res = await api.delete(`/teachers/${id}/assign/${assignmentId}`);
    return res.data?.data ?? res.data;
  },
  getSpecialties: async (id: string): Promise<TeacherSpecialty[]> => {
    const res = await api.get(`/teachers/${id}/specialties`);
    return res.data?.data ?? res.data ?? [];
  },
  addSpecialty: async (id: string, subjectId: string): Promise<TeacherSpecialty> => {
    const res = await api.post(`/teachers/${id}/specialties`, { subjectId });
    return res.data?.data ?? res.data;
  },
  removeSpecialty: async (id: string, specialtyId: string) => {
    const res = await api.delete(`/teachers/${id}/specialties/${specialtyId}`);
    return res.data?.data ?? res.data;
  },
  getAssigned: async (id: string, academicYearId?: string) => {
    const res = await api.get(`/teachers/${id}/assigned`, { params: { academicYearId } });
    return res.data?.data ?? res.data ?? [];
  },
  getAssignedSubjects: async (id: string, academicYearId?: string) => {
    const res = await api.get(`/teachers/${id}/assigned-subjects`, { params: { academicYearId } });
    return res.data;
  },
};