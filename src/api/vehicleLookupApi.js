import axios from "../utils/axiosInstance";

export const fetchVehicleLookupMakes = () =>
  axios.get("/vehicle-lookup/makes").then((r) => r.data.makes || []);

export const fetchVehicleLookupModels = (make) =>
  axios.get("/vehicle-lookup/models", { params: { make } }).then((r) => r.data.models || []);

export const fetchVehicleLookupTypes = (make, model) =>
  axios.get("/vehicle-lookup/types", { params: { make, model } }).then((r) => r.data.types || []);

// Independent of make/model/type — see models/VehicleLookupYear.js.
export const fetchVehicleLookupYears = () =>
  axios.get("/vehicle-lookup/years").then((r) => r.data.years || []);

// Adds one Make/Model/Type combo (or one Year) to the predefined lists —
// upserts, so re-submitting an existing value is a harmless no-op. This is
// what lets the "+ Add new…" option on the Add/Edit vehicle form actually
// grow the dropdowns instead of just accepting free text for that one save.
// Both are staff/admin, enforced server-side.
export const quickAddVehicleLookup = (make, model, type) =>
  axios.post("/vehicle-lookup/quick-add", { make, model, type }).then((r) => r.data);

export const quickAddVehicleLookupYear = (year) =>
  axios.post("/vehicle-lookup/quick-add-year", { year }).then((r) => r.data);

// Staff/admin (enforced server-side too): add a Make on its own — the Tire
// Size Option preset popup only has a Make, no Model/Type to pair it with.
// That's the field labelled "Preset name" on that popup.
export const addVehicleLookupMake = (make) =>
  axios.post("/vehicle-lookup/make", { make }).then((r) => r.data);

// Staff/admin: delete one entry from the Make / Model / Type / Year dropdown
// data. Deleting a Make also removes every Model/Type under it; deleting a
// Model removes its Types; a Year stands alone and cascades to nothing.
// Vehicle Notes and tire presets already saved with that value are untouched.
export const deleteVehicleLookupMake = (make) =>
  axios.delete("/vehicle-lookup/make", { params: { make } }).then((r) => r.data);

export const deleteVehicleLookupModel = ({ make, model }) =>
  axios.delete("/vehicle-lookup/model", { params: { make, model } }).then((r) => r.data);

export const deleteVehicleLookupType = ({ make, model, type }) =>
  axios.delete("/vehicle-lookup/type", { params: { make, model, type } }).then((r) => r.data);

export const deleteVehicleLookupYear = (year) =>
  axios.delete("/vehicle-lookup/year", { params: { year } }).then((r) => r.data);

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
