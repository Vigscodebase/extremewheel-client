import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as savedComparisonsApi from "../../api/savedComparisonsApi";

export const savedComparisonsKey = ["saved-comparisons"];

export function useSavedComparisonsQuery() {
  return useQuery({
    queryKey: savedComparisonsKey,
    queryFn: savedComparisonsApi.fetchSavedComparisons,
  });
}

// A new save shows up in the "Saved comparisons" table straight away.
export function useCreateSavedComparison() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: savedComparisonsApi.createSavedComparison,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: savedComparisonsKey }),
  });
}
