import axios from "../utils/axiosInstance";

// NOTE: axios is created with baseURL "/api", so every path here is relative
// to that (e.g. "/auth/login" -> requests "/api/auth/login").
export const loginRequest = (email, password) =>
  axios.post("/auth/login", { email, password }).then((r) => r.data);

export const registerRequest = (payload) =>
  axios.post("/auth/register", payload).then((r) => r.data);

export const fetchMe = () => axios.get("/auth/me").then((r) => r.data.user);

export const refreshTokenRequest = () => axios.post("/auth/refresh").then((r) => r.data);

export const forgotPasswordRequest = (email) =>
  axios.post("/auth/forgot-password", { email }).then((r) => r.data);

export const resetPasswordRequest = ({ email, token, password }) =>
  axios.post("/auth/reset-password", { email, token, password }).then((r) => r.data);
