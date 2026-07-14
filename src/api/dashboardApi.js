import axios from "../utils/axiosInstance";

export const fetchDashboardSummary = () => axios.get("/dashboard/summary").then((r) => r.data);
