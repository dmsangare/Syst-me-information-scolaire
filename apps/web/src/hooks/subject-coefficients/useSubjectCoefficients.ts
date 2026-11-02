import { useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { subjectCoefficientsApi } from "@/api/subject-coefficients";
import type { SetCoefficientInput } from "@/types/subject-coefficient";
import { getErrorMessage } from "@/lib/axios";

const KEY = "subject-coefficients";

/**
 * Hook qui charge en parallele les coefficients de plusieurs matieres.
 * Utiliser quand on affiche un tableau (1 matiere = 1 requete).
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
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
