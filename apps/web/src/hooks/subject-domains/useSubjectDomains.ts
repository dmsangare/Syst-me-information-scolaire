import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { subjectDomainsApi, type SubjectDomain, type CreateSubjectDomainInput } from "@/api/subject-domains";
import { getErrorMessage } from "@/lib/axios";

const KEY = "subject-domains";

export function useSubjectDomains() {
  return useQuery<SubjectDomain[]>({
    queryKey: [KEY, "list"],
    queryFn: () => subjectDomainsApi.list(),
    staleTime: 10 * 60_000,
  });
}

export function useCreateSubjectDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSubjectDomainInput) => subjectDomainsApi.create(input),
    onSuccess: () => {
      toast.success("Domaine cree");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteSubjectDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subjectDomainsApi.remove(id),
    onSuccess: () => {
      toast.success("Domaine supprime");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
