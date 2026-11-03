import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { subjectCoefficientsApi } from "@/api/subject-coefficients";
import type {
  SetCoefficientInput,
  CoefficientAudit,
  CoefficientAuditFilters,
} from "@/types/subject-coefficient";
import { getErrorMessage } from "@/lib/axios";

const KEY = "subject-coefficients";

/**
 * Hook qui charge en parallele les coefficients de plusieurs matieres.
 */
export function useCoefficientsForSubjects(subjectIds: string[], enabled = true) {
  const queries = useQueries({
    queries: subjectIds.map((id) => ({
      queryKey: [KEY, "by-subject", id],
      queryFn: () => subjectCoefficientsApi.listBySubject(id),
      enabled,
      staleTime: 60_000,
    })),
  });
  return {
    queries,
    isLoading: queries.some((q) => q.isLoading),
    error: queries.find((q) => q.error)?.error ?? null,
  };
}

export function useSetCoefficient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { subjectId: string; input: SetCoefficientInput }) =>
      subjectCoefficientsApi.set(args.subjectId, args.input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, "by-subject", vars.subjectId] });
      qc.invalidateQueries({ queryKey: [KEY, "audits", vars.subjectId] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useRemoveCoefficient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { subjectId: string; levelId: string; academicYearId: string }) =>
      subjectCoefficientsApi.remove(args.subjectId, args.levelId, args.academicYearId),
    onSuccess: (_, vars) => {
      toast.success("Coefficient supprime");
      qc.invalidateQueries({ queryKey: [KEY, "by-subject", vars.subjectId] });
      qc.invalidateQueries({ queryKey: [KEY, "audits", vars.subjectId] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

/**
 * Hook qui charge l'historique des modifications pour une matiere.
 * Filtre par niveau et annee scolaire.
 */
export function useCoefficientAudits(
  subjectId: string | undefined,
  filters: CoefficientAuditFilters = {},
  enabled = true,
) {
  return useQuery<CoefficientAudit[]>({
    queryKey: [KEY, "audits", subjectId, filters],
    queryFn: () => subjectCoefficientsApi.listAudits(subjectId!, filters),
    enabled: Boolean(subjectId) && enabled,
    staleTime: 30_000,
  });
}