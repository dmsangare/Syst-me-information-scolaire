import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { assessmentsApi, AssessmentListFilters } from "@/api/assessments";
import { getErrorMessage } from "@/lib/axios";
import type { CreateAssessmentInput } from "@/types/grades";

const KEY = "assessments";

export function useAssessments(filters: AssessmentListFilters = {}) {
  return useQuery({
    queryKey: [KEY, "list", filters],
    queryFn: () => assessmentsApi.list(filters),
  });
}

export function useAssessment(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, "detail", id],
    queryFn: () => assessmentsApi.getById(id!),
    enabled: !!id,
  });
}

export function useCreateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssessmentInput) => assessmentsApi.create(input),
    onSuccess: () => {
      toast.success("Evaluation creee");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateAssessmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "open" | "submit" | "validate" | "lock" | "reopen" }) => {
      return assessmentsApi[action](id);
    },
    onSuccess: () => {
      toast.success("Statut mis a jour");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}