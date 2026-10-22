import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as usersApi from "../../api/usersApi";
import { updateUserPermissions } from "../../api/permissionsApi";

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
// Saves one user's permissions and patches the cached users list straight away,
// so the permissions screen doesn't flicker back to the old grants while the
// list refetches.
export function useUpdateUserPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUserPermissions,
    onSuccess: (saved) => {
      queryClient.setQueryData(usersKey, (old) =>
        Array.isArray(old) ? old.map((u) => (u._id === saved._id ? { ...u, permissions: saved.permissions } : u)) : old
      );
      queryClient.invalidateQueries({ queryKey: usersKey });
    },
  });
}
