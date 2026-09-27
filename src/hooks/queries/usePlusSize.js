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

// Appends new width/aspect/rim rows to the oe_tiresize library — a size
// already on file is left untouched, so this never needs to invalidate an
// existing search's results, only whatever the person runs next.
export function useImportOeTireSizeXlsx() {
  return useMutation({
    mutationFn: plusSizeApi.importOeTireSizeXlsx,
  });
}

export function useDownloadOeTireSizeXlsx() {
  return useMutation({
    mutationFn: plusSizeApi.downloadOeTireSizeXlsx,
  });
}
