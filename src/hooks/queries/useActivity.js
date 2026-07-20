import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as activityApi from "../../api/activityApi";

export const recentActivityKey = ["activity", "recent"];

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
