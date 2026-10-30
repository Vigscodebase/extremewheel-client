import axios from "../utils/axiosInstance";
import { compactParams } from "./pagedParams";

export const fetchVehicleNotes = () =>
  axios.get("/vehicle-notes").then((r) => r.data.vehicles || []);

export const fetchVehicleNote = (id) =>
  axios.get(`/vehicle-notes/${id}`).then((r) => r.data.vehicle);

// Saves carry base64 photos, so give them far longer than the 15 s default
// before the browser gives up on the upload.
const UPLOAD_TIMEOUT_MS = 120000;

// --- Background saves (Redis queue + worker; progress over WebSocket) -------
// Create / edit no longer wait for MongoDB. The server checks the request,
// queues it and answers 202 { jobId, vehicleId } almost immediately; the page
// then follows the save live (hooks/useVehicleNoteSaves.js). When the queue is
// unavailable the server saves inline and answers 200/201 { vehicle } instead —
// both shapes come back from this one function as { queued, jobId, vehicleId, vehicle }.
//
// `clientRef` is a random id made by the page for each attempt. It lets the
// server ignore an accidental double submit and lets the page match the live
// messages to the right save.
export const submitVehicleNoteSave = ({ kind, id, payload, clientRef, onUploadProgress }) => {
  const config = {
    timeout: UPLOAD_TIMEOUT_MS,
    onUploadProgress: onUploadProgress
      ? (e) => e.total && onUploadProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)))
      : undefined,
  };
  const body = { ...payload, clientRef };
  const request = kind === "update"
    ? axios.put(`/vehicle-notes/${id}`, body, config)
    : axios.post("/vehicle-notes", body, config);
  return request.then((r) =>
    r.status === 202
      ? { queued: true, jobId: String(r.data.jobId), vehicleId: r.data.vehicleId }
      : { queued: false, vehicle: r.data.vehicle, vehicleId: r.data.vehicle?._id }
  );
};

// Safety net for a missed WebSocket message: queued | processing | done | failed.
export const fetchVehicleNoteSaveStatus = (jobId) =>
  axios.get(`/vehicle-notes/save-status/${encodeURIComponent(jobId)}`, { silentError: true }).then((r) => r.data);

// A one-time, 30-second ticket to open the live-update WebSocket with.
// The body must be `{}`, not null: with a JSON content type a null body goes out
// as the text "null", which Express's JSON parser rejects with a 400 before the
// route even runs.
export const fetchVehicleNotesWsTicket = () =>
  axios.post("/vehicle-notes/ws-ticket", {}, { silentError: true }).then((r) => r.data.ticket);

// Where the WebSocket lives: next to the API (same host / same prefix as the
// axios baseURL, with /ws on the end). If the API sits behind a proxy that
// serves WebSockets somewhere else, set VITE_WS_URL (e.g. wss://api.example.com/ws).
export function vehicleNotesSocketUrl(ticket) {
  const override = import.meta.env?.VITE_WS_URL;
  const url = new URL(override || axios.defaults?.baseURL || "/", window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  if (!override) url.pathname = `${url.pathname.replace(/\/+$/, "")}/ws`;
  url.search = "";
  url.hash = "";
  url.searchParams.set("ticket", ticket);
  return url.toString();
}

// Old one-request-does-it-all saves (still exported for anything that uses them).
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
