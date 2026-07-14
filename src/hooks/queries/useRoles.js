import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as rolesApi from "../../api/rolesApi";

export const rolesKey = ["roles"];

export function useRolesQuery() {
  return useQuery({
    queryKey: rolesKey,
    queryFn: rolesApi.fetchRoles,
    staleTime: 60_000,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rolesApi.createRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rolesKey }),
  });
}
