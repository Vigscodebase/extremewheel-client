import axios from "../utils/axiosInstance";

// Customers are staff/admin only on the server. Adding is open to both;
// editing and deleting are admin only (enforced server-side too).
export const fetchCustomers = () =>
  axios.get("/customers").then((r) => r.data.customers || []);

export const createCustomer = (payload) =>
  axios.post("/customers", payload).then((r) => r.data.customer);

export const updateCustomer = ({ id, ...payload }) =>
  axios.put(`/customers/${id}`, payload).then((r) => r.data.customer);

export const deleteCustomer = (id) =>
  axios.delete(`/customers/${id}`).then((r) => r.data);
