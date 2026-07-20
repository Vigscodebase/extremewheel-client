import axios from "../utils/axiosInstance";

export const fetchReportsSummary = ({ from, to } = {}) =>
  axios.get("/reports/summary", { params: { from, to } }).then((r) => r.data);

// Triggers a CSV download for the given report type + date range by
// fetching the blob and handing it to the browser's normal download flow
// (keeps the auth header intact — a plain <a href> can't attach it).
export const downloadReportCsv = async ({ type, from, to }) => {
  const response = await axios.get("/reports/export", {
    params: { type, from, to },
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${type}-report-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
