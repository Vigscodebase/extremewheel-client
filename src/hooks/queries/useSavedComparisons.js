import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as savedComparisonsApi from "../../api/savedComparisonsApi";
import useCursorPagination from "./useCursorPagination";
import useSuggestions from "./useSuggestions";

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

// Paginated + searchable table (10 per page, cursor based). Lives under
// ["saved-comparisons"], so saving a comparison (or editing a customer)
// refreshes the page being viewed.
export const useSavedComparisonsPage = (params) =>
  useCursorPagination({ queryKey: savedComparisonsKey, fetchPage: savedComparisonsApi.fetchSavedComparisonsPage, params });

export const useSavedComparisonSuggestions = (text, enabled = true) =>
  useSuggestions({ queryKey: savedComparisonsKey, fetchSuggestions: savedComparisonsApi.fetchSavedComparisonSuggestions, text, enabled });

// Filter dropdown values. Make / Model / Type cascade, so the key carries them.
export function useSavedComparisonFacets({ make = "", model = "" } = {}) {
  return useQuery({
    queryKey: [...savedComparisonsKey, "facets", make, make ? model : ""],
    queryFn: ({ signal }) => savedComparisonsApi.fetchSavedComparisonFacets({ make, model }, signal),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}
