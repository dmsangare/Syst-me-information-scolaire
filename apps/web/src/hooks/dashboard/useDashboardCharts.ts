import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

const KEY = "dashboard";

// ============================================================
// ENROLLMENT BY CLASS
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

export function useEnrollmentByClass() {
  return useQuery({
    queryKey: [KEY, "enrollment-by-class"],
    queryFn: async () => {
      const { data } = await api.get<EnrollmentByClassResponse>("/dashboard/enrollment-by-class");
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

// ============================================================
// CLASSES DISTRIBUTION
// ============================================================

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

export function useClassesDistribution() {
  return useQuery({
    queryKey: [KEY, "classes-distribution"],
    queryFn: async () => {
      const { data } = await api.get<ClassesDistributionResponse>("/dashboard/classes-distribution");
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

// ============================================================
// RECENT REPORT CARDS
// ============================================================

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

export function useRecentReportCards(limit = 5) {
  return useQuery({
    queryKey: [KEY, "recent-report-cards", limit],
    queryFn: async () => {
      const { data } = await api.get<RecentReportCardsResponse>("/dashboard/recent-report-cards", {
        params: { limit },
      });
      return data;
    },
    staleTime: 60_000,
  });
}

// ============================================================
// RECENT ACTIVITIES
// ============================================================

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

export function useRecentActivities(limit = 10) {
  return useQuery({
    queryKey: [KEY, "recent-activities", limit],
    queryFn: async () => {
      const { data } = await api.get<RecentActivitiesResponse>("/dashboard/recent-activities", {
        params: { limit },
      });
      return data;
    },
    staleTime: 60_000,
  });
}

// ============================================================
// LOT 3 — GRADES BY SUBJECT
// ============================================================

export interface GradesBySubjectItem {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  average: number | null;
  gradesCount: number;
  scale: number;
}

export interface GradesBySubjectResponse {
  class: {
    id: string;
    name: string;
    level: { id: string; name: string; cycle: string } | null;
  } | null;
  term: { id: string; name: string; type: string } | null;
  scale: number | null;
  subjects: GradesBySubjectItem[];
  message?: string;
}

export function useGradesBySubject(classId?: string, termId?: string) {
  return useQuery({
    queryKey: [KEY, "grades-by-subject", classId, termId],
    queryFn: async () => {
      const { data } = await api.get<GradesBySubjectResponse>("/dashboard/grades-by-subject", {
        params: { classId, termId },
      });
      return data;
    },
    enabled: !!classId,
    staleTime: 2 * 60_000,
  });
}