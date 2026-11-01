import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { gradesApi } from "@/api/grades";
import { getErrorMessage } from "@/lib/axios";
import type {
  MatrixResponse,
  BatchMatrixPayload,
  BatchMatrixResult,
} from "@/types/grades";

const KEY = "grades";

// ============================================================
// MATRICE ELEVES x MATIERES - LECTURE
// ============================================================
export function useMatrix(
  classId: string | undefined,
  termId: string | undefined,
  assessmentType: string | undefined,
) {
  return useQuery<MatrixResponse>({
    queryKey: [KEY, "matrix", classId, termId, assessmentType],
    queryFn: () => gradesApi.getMatrix(classId!, termId!, assessmentType!),
    enabled: !!classId && !!termId && !!assessmentType,
    staleTime: 30_000, // 30s : la matrice change peu
  });
}

// ============================================================
// MATRICE ELEVES x MATIERES - ECRITURE
// ============================================================
export function useSaveBatchMatrix() {
  const qc = useQueryClient();
  return useMutation<BatchMatrixResult, Error, BatchMatrixPayload>({
    mutationFn: (payload) => gradesApi.saveBatchMatrix(payload),
    onSuccess: (result, variables) => {
      const parts: string[] = [];
      if (result.created > 0) parts.push(result.created + " creee(s)");
      if (result.updated > 0) parts.push(result.updated + " mise(s) a jour");
      if (result.skipped > 0) parts.push(result.skipped + " ignoree(s)");

      if (result.conflicts.length > 0) {
        toast.warning(
          "Notes partiellement enregistrees. " +
          result.conflicts.length + " conflit(s) detecte(s). Utilisez overwrite=true pour ecraser.",
        );
      } else if (parts.length > 0) {
        toast.success("Notes enregistrees : " + parts.join(", "));
      } else {
        toast.info("Aucune modification detectee");
      }

      // Invalider la matrice pour recharger les donnees a jour
      qc.invalidateQueries({ queryKey: [KEY, "matrix"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
