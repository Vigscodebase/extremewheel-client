import axios from "../utils/axiosInstance";
import { compactParams } from "./pagedParams";

export const fetchTireOptions = () =>
  axios.get("/tire-options").then((r) => r.data.options || []);

export const createTireOption = (payload) =>
  axios.post("/tire-options", payload).then((r) => r.data.option);

export const updateTireOption = ({ id, ...payload }) =>
  axios.put(`/tire-options/${id}`, payload).then((r) => r.data.option);

export const deleteTireOption = (id) =>
  axios.delete(`/tire-options/${id}`).then((r) => r.data);

// One page (12 rows by default) of the Tire Size Option list, newest first — cursor based.
// params: { q, customer, cursor, limit } -> { items, nextCursor, hasMore, total, searchMode }
export const fetchTireOptionsPage = (params, signal) =>
  axios.get("/tire-options/page", { params: compactParams(params), signal, silentError: true }).then((r) => r.data);

export const fetchTireOptionSuggestions = (q, signal) =>
  axios.get("/tire-options/suggest", { params: { q }, signal, silentError: true }).then((r) => r.data.suggestions || []);
