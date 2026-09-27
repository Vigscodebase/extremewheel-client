import axios from "../utils/axiosInstance";

export const searchPlusSize = (payload) =>
  axios.post("/plus-size/search", payload).then((r) => r.data);

export const savePlusSizeMatch = (payload) =>
  axios.post("/plus-size/save", payload).then((r) => r.data.activity);

// --- OE tire size library (oe_tiresize) upload/download ---
// Same base64-JSON upload / blob download shape as vehicleLookupApi.js.
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export const importOeTireSizeXlsx = async (file) => {
  const fileBase64 = await fileToBase64(file);
  return axios
    .post("/plus-size/oe-tiresize/import", { fileBase64, fileName: file.name })
    .then((r) => r.data);
};

export const downloadOeTireSizeXlsx = () =>
  axios.get("/plus-size/oe-tiresize/export", { responseType: "blob" }).then((r) => {
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const link = document.createElement("a");
    link.href = url;
    const disposition = r.headers?.["content-disposition"] || "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    link.download = match?.[1] || `oe-tiresize-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  });
