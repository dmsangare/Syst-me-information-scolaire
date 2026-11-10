import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { campaignsApi } from "@/api/campaigns";
import type { CreateCampaignInput, CampaignListFilters } from "@/types/campaign";

const KEY = "campaigns";

export function useCampaigns(filters: CampaignListFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: () => campaignsApi.list(filters),
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => campaignsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCampaignInput) => campaignsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useActivateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campaignsApi.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useValidateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campaignsApi.validate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useCampaignResults(id: string) {
  return useQuery({
    queryKey: [KEY, id, "results"],
    queryFn: () => campaignsApi.getResults(id),
    enabled: !!id,
  });
}