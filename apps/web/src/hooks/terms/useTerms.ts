import { useQuery } from "@tanstack/react-query";
import { termsApi, type Term } from "@/api/terms";

const KEY = "terms";

export function useTerms(academicYearId: string | undefined) {
  return useQuery<Term[]>({
    queryKey: [KEY, "list", academicYearId || "all"],
    queryFn: () => termsApi.list(academicYearId),
    staleTime: 5 * 60_000,
    enabled: !!academicYearId,
  });
}

export function useCurrentTerm() {
  return useQuery<Term | null>({
    queryKey: [KEY, "current"],
    queryFn: () => termsApi.getCurrent(),
    staleTime: 5 * 60_000,
  });
}
