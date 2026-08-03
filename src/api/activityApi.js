import axios from "../utils/axiosInstance";

export const fetchRecentActivity = (limit = 5) =>
  axios.get("/activity/recent", { params: { limit } }).then((r) => r.data);

export const logTireComparison = (payload) =>
  axios.post("/activity/tire-comparison", payload).then((r) => r.data.activity);

export const logVehicleSearch = (payload) =>
  axios.post("/activity/vehicle-search", payload).then((r) => r.data.activity);

// Cross-feature "you've saved something like this before" lookup — used to
// surface matching saved presets, past comparisons and vehicle notes
// (with before/after photos) under a freshly computed tire result.
export const fetchTireSuggestions = ({ width, aspect, rim }) =>
  axios.get("/activity/suggestions", { params: { width, aspect, rim } }).then((r) => r.data);
