import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";

const KEY = "attendance-alerts";

export function useAttendanceAlerts(status?: string) {
  return useQuery({
    queryKey: [KEY, "list", status],
    queryFn: async () => {
      const { data } = await api.get("/attendance/alerts", {
        params: status ? { status } : {},
      });
      return data.data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useUpdateAlertStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { status: string; notes?: string } }) =>
      api.patch(`/attendance/alerts/${id}`, dto),
    onSuccess: () => {
      toast.success("Alerte mise à jour");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Erreur"),
  });
}

export function useDetectAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/attendance/alerts/detect"),
    onSuccess: () => {
      toast.success("Détection lancée");
      qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

export function useAlertDetails(alertId: string | null) {
  return useQuery({
    queryKey: [KEY, "details", alertId],
    queryFn: async () => {
      const { data } = await api.get(`/attendance/alerts/${alertId}`);
      return data;
    },
    enabled: !!alertId,
    staleTime: 30_000,
  });
}