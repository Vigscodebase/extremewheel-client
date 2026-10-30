import axios from "../utils/axiosInstance";
import { compactParams } from "./pagedParams";

export const fetchVehicleNotes = () =>
  axios.get("/vehicle-notes").then((r) => r.data.vehicles || []);

export const fetchVehicleNote = (id) =>
  axios.get(`/vehicle-notes/${id}`).then((r) => r.data.vehicle);

// Saves carry base64 photos, so give them far longer than the 15 s default
// before the browser gives up on the upload.
const UPLOAD_TIMEOUT_MS = 120000;

export const createVehicleNote = (payload) =>
  axios.post("/vehicle-notes", payload, { timeout: UPLOAD_TIMEOUT_MS }).then((r) => r.data.vehicle);

export const updateVehicleNote = ({ id, ...payload }) =>
  axios.put(`/vehicle-notes/${id}`, payload, { timeout: UPLOAD_TIMEOUT_MS }).then((r) => r.data.vehicle);

export const deleteVehicleNote = (id) =>
  axios.delete(`/vehicle-notes/${id}`).then((r) => r.data);

export const addVehicleGalleryPhoto = ({ id, image }) =>
  axios.post(`/vehicle-notes/${id}/gallery`, { image }, { timeout: UPLOAD_TIMEOUT_MS }).then((r) => r.data.vehicle);

export const removeVehicleGalleryPhoto = ({ id, image }) =>
  axios.delete(`/vehicle-notes/${id}/gallery`, { data: { image } }).then((r) => r.data.vehicle);

export const addVehicleStaffNote = ({ id, text }) =>
  axios.post(`/vehicle-notes/${id}/notes`, { text }).then((r) => r.data.vehicle);

export const removeVehicleStaffNote = ({ id, noteId }) =>
  axios.delete(`/vehicle-notes/${id}/notes/${noteId}`).then((r) => r.data.vehicle);

// One page (10 cards) of the Vehicle Notes list, newest first — cursor based.
// params: { q, make, model, type, customer, yearFrom, yearTo, cursor, limit }
// -> { items, nextCursor, hasMore, total, searchMode }
export const fetchVehicleNotesPage = (params, signal) =>
  axios.get("/vehicle-notes/page", { params: compactParams(params), signal, silentError: true }).then((r) => r.data);

export const fetchVehicleNoteSuggestions = (q, signal) =>
  axios.get("/vehicle-notes/suggest", { params: { q }, signal, silentError: true }).then((r) => r.data.suggestions || []);
