import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts";
import { toast } from "sonner";
import { feeStructuresApi, type FeeStructureFilters } from "@/api/fee-structures";
import { getErrorMessage } from "@/lib/axios";
import type { CreateFeeStructureInput } from "@/types/finance";

const KEY = "fee-structures";

export function useFeeStructures(filters: FeeStructureFilters = {}) {
  return useQuery({
    queryKey: [KEY, "list", filters],
    queryFn: () => feeStructuresApi.list(filters),
    staleTime: 5 * 60_000,
  });
}

export function useCreateFeeStructure() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: CreateFeeStructureInput) => {
      const payload = {
        ...input,
        schoolId: (input as any).schoolId || user?.schoolId,
      };
      return feeStructuresApi.create(payload);
    },
    onSuccess: () => {
      toast.success("Tarif enregistré");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateFeeStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateFeeStructureInput> }) =>
      feeStructuresApi.update(id, input),
    onSuccess: () => {
      toast.success("Tarif mis à jour");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteFeeStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feeStructuresApi.remove(id),
    onSuccess: () => {
      toast.success("Tarif supprimé");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}


export function useFeeCoverage(academicYearId?: string) {
  return useQuery({
    queryKey: [KEY, "coverage", academicYearId],
    queryFn: () => feeStructuresApi.getCoverage(academicYearId!),
    enabled: !!academicYearId,
    staleTime: 60_000,
  });
}
