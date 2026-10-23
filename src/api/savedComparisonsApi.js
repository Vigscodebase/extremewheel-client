import axios from "../utils/axiosInstance";

// Saves a tire comparison together with its vehicle details (and optional
// customer). Stored in its own collection on the server — separate from
// Vehicle Notes.
export const createSavedComparison = (payload) =>
  axios.post("/saved-comparisons", payload).then((r) => r.data.comparison);
