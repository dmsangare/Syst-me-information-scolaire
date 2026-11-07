import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

// ============================================================
// TYPES
// ============================================================

export interface EnrollmentClassItem {
  classId: string;
  className: string;
  levelName: string | null;
  cycle: string | null;
  boys: number;
  girls: number;
  total: number;
}

export interface EnrollmentByClassResponse {
  academicYear: string | null;
  classes: EnrollmentClassItem[];
}

export interface ClassesDistributionLevel {
  levelId: string;
  levelName: string;
  cycle: string;
  orderIndex: number;
  count: number;
}

export interface ClassesDistributionResponse {
  total: number;
  levels: ClassesDistributionLevel[];
}

export interface RecentReportCard {
  id: string;
  status: "DRAFT" | "VALIDATED" | "PUBLISHED";
  average: string | null;
  scale: number;
  createdAt: string;
  updatedAt: string;
  student: { id: string; firstName: string; lastName: string; matricule: string };
  class: { id: string; name: string };
  term: { id: string; name: string; type: string };
}

export interface RecentReportCardsResponse {
  data: RecentReportCard[];
}

export interface RecentActivity {
  id: string;
  action: string;
  label: string;
  module: string;
  objectType: string | null;
  objectId: string | null;
  userId: string | null;
  createdAt: string;
  title: string | null;
}

export interface RecentActivitiesResponse {
  data: RecentActivity[];
}

// ============================================================
// HOOKS
// ============================================================

const KEY = "dashboard";

export function useEnrollmentByClass() {
  return useQuery({
    queryKey: [KEY, "enrollment-by-class"],
    queryFn: async () => {
      const { data } = await api.get<EnrollmentByClassResponse>(
        "/dashboard/enrollment-by-class",
      );
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useClassesDistribution() {
  return useQuery({
    queryKey: [KEY, "classes-distribution"],
    queryFn: async () => {
      const { data } = await api.get<ClassesDistributionResponse>(
        "/dashboard/classes-distribution",
      );
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useRecentReportCards(limit = 5) {
  return useQuery({
    queryKey: [KEY, "recent-report-cards", limit],
    queryFn: async () => {
      const { data } = await api.get<RecentReportCardsResponse>(
        "/dashboard/recent-report-cards",
        { params: { limit } },
      );
      return data;
    },
    staleTime: 60_000,
  });
}

export function useRecentActivities(limit = 10) {
  return useQuery({
    queryKey: [KEY, "recent-activities", limit],
    queryFn: async () => {
      const { data } = await api.get<RecentActivitiesResponse>(
        "/dashboard/recent-activities",
        { params: { limit } },
      );
      return data;
    },
    staleTime: 60_000,
  });
}