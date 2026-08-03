import axios from "../utils/axiosInstance";

export const searchPlusSize = (payload) =>
  axios.post("/plus-size/search", payload).then((r) => r.data);

export const savePlusSizeMatch = (payload) =>
  axios.post("/plus-size/save", payload).then((r) => r.data.activity);
