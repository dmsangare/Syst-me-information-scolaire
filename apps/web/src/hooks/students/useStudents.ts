import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { studentsApi } from "@/api/students";
import { api } from "@/lib/axios";
import { getErrorMessage } from "@/lib/axios";
import type { StudentListFilters, CreateStudentInput } from "@/types/student";

const KEY = "students";

export function useStudents(filters: StudentListFilters = {}) {
  return useQuery({
    queryKey: [KEY, "list", filters],
    queryFn: () => studentsApi.list(filters),
    placeholderData: (previousData) => previousData,
  });
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, "detail", id],
    queryFn: () => studentsApi.getById(id!),
    enabled: !!id,
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStudentInput) => studentsApi.create(input),
    onSuccess: () => {
      toast.success("Eleve cree avec succes");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateStudentInput> }) =>
      studentsApi.update(id, data),
    onSuccess: () => {
      toast.success("Eleve mis a jour");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentsApi.remove(id),
    onSuccess: () => {
      toast.success("Eleve supprime");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useStudentStats() {
  return useQuery({
    queryKey: [KEY, "stats"],
    queryFn: () => studentsApi.getStats(),
  });
}

export function useStudentPathway(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, "pathway", id],
    queryFn: () => studentsApi.getPathway(id!),
    enabled: !!id,
  });
}

export function useExportStudents() {
  return useMutation({
    mutationFn: ({
      format,
      filters,
    }: {
      format: "csv" | "excel" | "pdf";
      filters: StudentListFilters;
    }) => studentsApi.downloadExport(format, filters),
    onSuccess: (_, variables) => {
      toast.success(`Export ${variables.format.toUpperCase()} telecharge`);
    },
    onError: (error) => {
      toast.error(`Erreur export : ${getErrorMessage(error)}`);
    },
  });
}

export function useAvailableStudents() {
  return useQuery({
    queryKey: ["students", "available"],
    queryFn: async () => {
      const { data } = await api.get("/students/available");
      return (data.data || data) as Array<{
        id: string;
        matricule: string;
        firstName: string;
        lastName: string;
      }>;
    },
    staleTime: 60_000,
  });
}