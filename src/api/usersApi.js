import axios from "../utils/axiosInstance";
import { compactParams } from "./pagedParams";

export const fetchUsers = () => axios.get("/users").then((r) => r.data.users || []);

export const createUser = (payload) => axios.post("/users", payload).then((r) => r.data.user);

// `permissionsReset` is true when the email changed and the user's permissions
// were wiped as a result (permissions belong to the email address).
export const updateUser = ({ id, ...payload }) =>
  axios.put(`/users/${id}`, payload).then((r) => ({ ...r.data.user, permissionsReset: !!r.data.permissionsReset }));

export const deleteUser = (id) => axios.delete(`/users/${id}`).then((r) => r.data);

// One page (10 rows) of the Users table, newest first — cursor based.
// params: { q, cursor, limit } -> { items, nextCursor, hasMore, total, searchMode }
export const fetchUsersPage = (params, signal) =>
  axios.get("/users/page", { params: compactParams(params), signal, silentError: true }).then((r) => r.data);

export const fetchUserSuggestions = (q, signal) =>
  axios.get("/users/suggest", { params: { q }, signal, silentError: true }).then((r) => r.data.suggestions || []);
