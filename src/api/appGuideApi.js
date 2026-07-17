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
