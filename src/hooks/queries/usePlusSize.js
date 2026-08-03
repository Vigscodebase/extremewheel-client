import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as plusSizeApi from "../../api/plusSizeApi";
import { recentActivityKey } from "./useActivity";
import { dashboardKey } from "./useDashboard";

export function usePlusSizeSearch() {
  return useMutation({
    mutationFn: plusSizeApi.searchPlusSize,
  });
}

export function useSavePlusSizeMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: plusSizeApi.savePlusSizeMatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recentActivityKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}
