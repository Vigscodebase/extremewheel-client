import axios from "../utils/axiosInstance";

export const fetchUsers = () => axios.get("/users").then((r) => r.data.users || []);

export const createUser = (payload) => axios.post("/users", payload).then((r) => r.data.user);

export const updateUser = ({ id, ...payload }) =>
  axios.put(`/users/${id}`, payload).then((r) => r.data.user);

export const deleteUser = (id) => axios.delete(`/users/${id}`).then((r) => r.data);
