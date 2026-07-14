import axios from "../utils/axiosInstance";

export const fetchRoles = () => axios.get("/roles").then((r) => r.data.roles || []);

export const createRole = (payload) => axios.post("/roles", payload).then((r) => r.data.role);
