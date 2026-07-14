import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as tireOptionsApi from "../../api/tireOptionsApi";

export const tireOptionsKey = ["tire-options"];

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
