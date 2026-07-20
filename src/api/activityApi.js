import axios from "../utils/axiosInstance";

export const fetchRecentActivity = (limit = 5) =>
  axios.get("/activity/recent", { params: { limit } }).then((r) => r.data);

export const logTireComparison = (payload) =>
  axios.post("/activity/tire-comparison", payload).then((r) => r.data.activity);

export const logVehicleSearch = (payload) =>
  axios.post("/activity/vehicle-search", payload).then((r) => r.data.activity);
