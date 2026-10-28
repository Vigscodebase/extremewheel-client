import axios from "../utils/axiosInstance";

// All saved comparisons, newest first — backs the "Saved comparisons" table at
// the bottom of the Tire Size Comparison page. The customer is only included
// for staff / admin, and any photo gallery on older records is left out to keep the
// list light.
export const fetchSavedComparisons = () =>
  axios.get("/saved-comparisons").then((r) => r.data.comparisons || []);

// Saves a tire comparison together with its vehicle details (and optional
// customer). Stored in its own collection on the server — separate from
// Vehicle Notes.
export const createSavedComparison = (payload) =>
  axios.post("/saved-comparisons", payload).then((r) => r.data.comparison);
