import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as tireOptionsApi from "../../api/tireOptionsApi";
import useCursorPagination from "./useCursorPagination";
import useSuggestions from "./useSuggestions";

export const tireOptionsKey = ["tire-options"];

// The preset grid is 4 cards wide on a desktop screen, so 12 per page fills three rows.
export const TIRE_OPTIONS_PAGE_SIZE = 12;

export function useTireOptionsQuery() {
  return useQuery({
    queryKey: tireOptionsKey,
    queryFn: tireOptionsApi.fetchTireOptions,
  });
}

export function useCreateTireOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tireOptionsApi.createTireOption,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tireOptionsKey }),
  });
}

export function useUpdateTireOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tireOptionsApi.updateTireOption,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tireOptionsKey }),
  });
}

export function useDeleteTireOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tireOptionsApi.deleteTireOption,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tireOptionsKey }),
  });
}

// Paginated + searchable list for the Tire Size Option page (10 per page, cursor
// based). The full-list hook above stays for the Calculator / Comparison /
// Plus Size pickers.
export const useTireOptionsPage = (params) =>
  useCursorPagination({ queryKey: tireOptionsKey, fetchPage: tireOptionsApi.fetchTireOptionsPage, params, pageSize: TIRE_OPTIONS_PAGE_SIZE });

export const useTireOptionSuggestions = (text, enabled = true) =>
  useSuggestions({ queryKey: tireOptionsKey, fetchSuggestions: tireOptionsApi.fetchTireOptionSuggestions, text, enabled });
