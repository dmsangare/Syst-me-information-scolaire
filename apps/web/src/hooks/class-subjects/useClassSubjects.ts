import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  classSubjectsApi,
} from "@/api/class-subjects";
import type {
  ClassSubject,
  ClassSubjectListFilters,
  CreateClassSubjectInput,
  UpdateClassSubjectInput,
  BulkCreateClassSubjectInput,
  ReorderClassSubjectInput,
} from "@/types/class-subject";
import { getErrorMessage } from "@/lib/axios";

const KEY = "class-subjects";

export function useClassSubjects(filters: ClassSubjectListFilters = {}, enabled = true) {
  return useQuery<ClassSubject[]>({
    queryKey: [KEY, "list", filters],
    queryFn: () => classSubjectsApi.list(filters),
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateClassSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClassSubjectInput) => classSubjectsApi.create(input),
    onSuccess: () => {
      toast.success("Matiere affectee a la classe");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useBulkCreateClassSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkCreateClassSubjectInput) => classSubjectsApi.bulkCreate(input),
    onSuccess: (data) => {
      toast.success(data.length + " matiere(s) affectee(s)");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateClassSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateClassSubjectInput }) =>
      classSubjectsApi.update(args.id, args.input),
    onSuccess: () => {
      toast.success("Affectation mise a jour");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteClassSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classSubjectsApi.remove(id),
    onSuccess: () => {
      toast.success("Affectation desactivee");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useReorderClassSubjects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReorderClassSubjectInput) => classSubjectsApi.reorder(input),
    onSuccess: () => {
      toast.success("Ordre mis a jour");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
