import axios from "../utils/axiosInstance";

// The signed-in user's own grants: { email, isAdmin, permissions: [keys] }.
export const fetchMyPermissions = () => axios.get("/permissions/me").then((r) => r.data);

// Replace one user's grants. `email` is sent on purpose: permissions are granted
// to an email address, so the server refuses the save if that user's email has
// changed since the admin loaded the page.
export const updateUserPermissions = ({ id, email, permissions }) =>
  axios.put(`/permissions/users/${id}`, { email, permissions }).then((r) => r.data.user);
