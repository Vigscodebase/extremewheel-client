import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as activityApi from "../../api/activityApi";

export const recentActivityKey = ["activity", "recent"];
export const tireSuggestionsKey = ["activity", "suggestions"];

// Looks up saved presets / past comparisons / vehicle notes (with
// before-after photos) that match a given tire spec. Disabled until a
// complete, valid spec is supplied so pages don't fire it on partial input.
export function useTireSuggestions(tire) {
  const enabled = Boolean(tire && tire.width && tire.aspect && tire.rim);
  return useQuery({
    queryKey: [...tireSuggestionsKey, tire?.width, tire?.aspect, tire?.rim],
    queryFn: () => activityApi.fetchTireSuggestions(tire),
    enabled,
    staleTime: 15_000,
  });
}

export function useRecentActivity(limit = 5) {
  return useQuery({
    queryKey: [...recentActivityKey, limit],
    queryFn: () => activityApi.fetchRecentActivity(limit),
    staleTime: 30_000,
  });
}

export function useLogTireComparison() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activityApi.logTireComparison,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recentActivityKey }),
  });
}

export function useLogVehicleSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activityApi.logVehicleSearch,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recentActivityKey }),
  });
}
