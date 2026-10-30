import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as usersApi from "../../api/usersApi";
import { updateUserPermissions } from "../../api/permissionsApi";
import useCursorPagination from "./useCursorPagination";
import useSuggestions from "./useSuggestions";

export const usersKey = ["users"];

// The FULL user list — only the Permissions tab's user picker needs it, so the
// page passes `enabled` and skips it until that tab is opened.
export function useUsersQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: usersKey,
    queryFn: usersApi.fetchUsers,
    enabled,
  });
}

// Paginated + searchable Users table (10 per page, cursor based). Lives under
// ["users"], so create / edit / delete refresh the page being viewed.
export const useUsersPage = (params) =>
  useCursorPagination({ queryKey: usersKey, fetchPage: usersApi.fetchUsersPage, params });

export const useUserSuggestions = (text, enabled = true) =>
  useSuggestions({ queryKey: usersKey, fetchSuggestions: usersApi.fetchUserSuggestions, text, enabled });

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
