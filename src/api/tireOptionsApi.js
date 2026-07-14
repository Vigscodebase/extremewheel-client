import axios from "../utils/axiosInstance";

export const fetchTireOptions = () =>
  axios.get("/tire-options").then((r) => r.data.options || []);

export const createTireOption = (payload) =>
  axios.post("/tire-options", payload).then((r) => r.data.option);

export const updateTireOption = ({ id, ...payload }) =>
  axios.put(`/tire-options/${id}`, payload).then((r) => r.data.option);

export const deleteTireOption = (id) =>
  axios.delete(`/tire-options/${id}`).then((r) => r.data);
