import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as usersApi from "../../api/usersApi";

export const usersKey = ["users"];

export function useUsersQuery() {
  return useQuery({
    queryKey: usersKey,
    queryFn: usersApi.fetchUsers,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.updateUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  });
}
