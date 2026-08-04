import axios from "../utils/axiosInstance";

export const fetchVehicleNotes = () =>
  axios.get("/vehicle-notes").then((r) => r.data.vehicles || []);

export const createVehicleNote = (payload) =>
  axios.post("/vehicle-notes", payload).then((r) => r.data.vehicle);

export const updateVehicleNote = ({ id, ...payload }) =>
  axios.put(`/vehicle-notes/${id}`, payload).then((r) => r.data.vehicle);

export const deleteVehicleNote = (id) =>
  axios.delete(`/vehicle-notes/${id}`).then((r) => r.data);

export const addVehicleGalleryPhoto = ({ id, image }) =>
  axios.post(`/vehicle-notes/${id}/gallery`, { image }).then((r) => r.data.vehicle);

export const removeVehicleGalleryPhoto = ({ id, image }) =>
  axios.delete(`/vehicle-notes/${id}/gallery`, { data: { image } }).then((r) => r.data.vehicle);

export const addVehicleStaffNote = ({ id, text }) =>
  axios.post(`/vehicle-notes/${id}/notes`, { text }).then((r) => r.data.vehicle);

export const removeVehicleStaffNote = ({ id, noteId }) =>
  axios.delete(`/vehicle-notes/${id}/notes/${noteId}`).then((r) => r.data.vehicle);
