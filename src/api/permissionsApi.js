import axios from "../utils/axiosInstance";

export const fetchPermissions = () =>
  axios.get("/permissions").then((r) => r.data.permissions || {});

// Server expects { matrix }, not { permissions } - this is the contract,
// keep it consistent everywhere permissions are saved.
export const updatePermissions = (matrix) =>
  axios.put("/permissions", { matrix }).then((r) => r.data.permissions || {});
