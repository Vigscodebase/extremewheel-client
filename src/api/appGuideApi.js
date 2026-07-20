import axios from "../utils/axiosInstance";

export const fetchAppGuideYears = () =>
  axios.get("/app-guide/years").then((r) => r.data.years || []);

export const fetchAppGuideMakes = (year) =>
  axios.get("/app-guide/makes", { params: { year } }).then((r) => r.data.makes || []);

export const fetchAppGuideModels = (year, make) =>
  axios.get("/app-guide/models", { params: { year, make } }).then((r) => r.data.models || []);

export const fetchAppGuideTypes = (year, make, model) =>
  axios.get("/app-guide/types", { params: { year, make, model } }).then((r) => r.data.types || []);

export const fetchAppGuideFitment = (year, make, model, type, option) =>
  axios.get("/app-guide/fitment", { params: { year, make, model, type, option } }).then((r) => r.data.fitment || []);

// Downloads the current Tech Data set (optionally scoped to year/make/model)
// as a CSV file via the browser's normal download flow.
export const downloadTechDataCsv = async ({ year, make, model } = {}) => {
  const response = await axios.get("/app-guide/export", {
    params: { year, make, model },
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tech-data-export-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const importTechDataCsv = (csvText) =>
  axios.post("/app-guide/import", { csv: csvText }).then((r) => r.data);
