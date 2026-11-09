import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";

const KEY = "parent-contacts";

export function useParentContacts(studentId: string | null) {
  return useQuery({
    queryKey: [KEY, "student", studentId],
    queryFn: async () => {
      const { data } = await api.get(`/attendance/contacts/student/${studentId}`);
      return data.data ?? [];
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });
}

export function useCreateParentContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      studentId: string;
      guardianId?: string;
      alertId?: string;
      method: string;
      result: string;
      notes?: string;
      nextAction?: string;
      followUpDate?: string;
    }) => api.post("/attendance/contacts", dto),
    onSuccess: () => {
      toast.success("Contact enregistré");
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["attendance-alerts"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Erreur"),
  });
}