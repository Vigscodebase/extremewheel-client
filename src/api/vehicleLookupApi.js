import axios from "../utils/axiosInstance";

export const fetchVehicleLookupMakes = () =>
  axios.get("/vehicle-lookup/makes").then((r) => r.data.makes || []);

export const fetchVehicleLookupModels = (make) =>
  axios.get("/vehicle-lookup/models", { params: { make } }).then((r) => r.data.models || []);

export const fetchVehicleLookupTypes = (make, model) =>
  axios.get("/vehicle-lookup/types", { params: { make, model } }).then((r) => r.data.types || []);

// Downloads the current Make/Model/Type reference table as .xlsx via the
// browser's normal download flow — mirrors downloadTechDataCsv in
// appGuideApi.js, just with an xlsx blob instead of a csv one.
export const downloadVehicleLookupXlsx = async () => {
  const response = await axios.get("/vehicle-lookup/export", { responseType: "blob" });
  const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vehicle-notes-database-${Date.now()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Uploads a replacement .xlsx workbook — the whole reference table is
// re-synced from the file (not merged), same behavior as re-uploading the
// Tech Data CSV.
export const importVehicleLookupXlsx = async (file) => {
  const fileBase64 = await fileToBase64(file);
  return axios.post("/vehicle-lookup/import", { fileBase64 }).then((r) => r.data);
};
