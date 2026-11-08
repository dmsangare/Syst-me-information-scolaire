import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { dailyAttendanceApi } from "@/api/daily-attendance";

const KEY = "daily-attendance";

export function useAttendanceClassesStatus(date?: string) {
  return useQuery({
    queryKey: [KEY, "classes", date ?? "today"],
    queryFn: () => dailyAttendanceApi.getClassesStatus(date),
    staleTime: 30_000,
  });
}

export function useAttendanceDayStats(date?: string) {
  return useQuery({
    queryKey: [KEY, "stats", date ?? "today"],
    queryFn: () => dailyAttendanceApi.getDayStats(date),
    staleTime: 30_000,
  });
}

export function useAttendanceByClass(classId: string | null, date?: string) {
  return useQuery({
    queryKey: [KEY, "class", classId, date ?? "today"],
    queryFn: () => dailyAttendanceApi.getByClass(classId!, date),
    enabled: !!classId,
    staleTime: 10_000,
  });
}

export function useCreateDailyAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      classId: string;
      date: string;
      records: Array<{ studentId: string; status: string; observation?: string }>;
    }) => dailyAttendanceApi.create(dto),
    onSuccess: () => {
      toast.success("Appel enregistré");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Erreur lors de l'enregistrement"),
  });
}

export function useUpdateAttendanceRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      recordId,
      dto,
    }: {
      recordId: string;
      dto: { status: string; observation?: string; reason?: string };
    }) => dailyAttendanceApi.updateRecord(recordId, dto),
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Erreur"),
  });
}

// ============================================================
// LOT 3 : Justifications + Bilan élève
// ============================================================

import { attendanceStudentApi } from "@/api/daily-attendance";

export function useJustifyAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, dto }: { recordId: string; dto: { decision: "ACCEPTED" | "REJECTED"; reason: string; observation?: string } }) =>
      attendanceStudentApi.justifyRecord(recordId, dto),
    onSuccess: () => {
      toast.success("Absence justifiée");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Erreur"),
  });
}

export function useStudentAttendanceSummary(studentId: string | null, academicYearId?: string) {
  return useQuery({
    queryKey: [KEY, "student-summary", studentId, academicYearId],
    queryFn: () => attendanceStudentApi.getStudentSummary(studentId!, academicYearId),
    enabled: !!studentId,
    staleTime: 30_000,
  });
}

export function useStudentAttendanceHistory(studentId: string | null, academicYearId?: string) {
  return useQuery({
    queryKey: [KEY, "student-history", studentId, academicYearId],
    queryFn: () => attendanceStudentApi.getStudentHistory(studentId!, academicYearId),
    enabled: !!studentId,
    staleTime: 30_000,
  });
}
