import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as customersApi from "../../api/customersApi";
import { vehicleNotesKey } from "./useVehicleNotes";

export const customersKey = ["customers"];

// `enabled` lets the page skip the request entirely for roles the server
// would turn away (only staff and admin can read customers).
export function useCustomersQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: customersKey,
    queryFn: customersApi.fetchCustomers,
    enabled,
  });
}

// A customer change also changes what the vehicle notes show (their populated
// customer name / email / phone), so refresh those too.
function useCustomerMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersKey });
      queryClient.invalidateQueries({ queryKey: vehicleNotesKey });
    },
  });
}

export const useCreateCustomer = () => useCustomerMutation(customersApi.createCustomer);
export const useUpdateCustomer = () => useCustomerMutation(customersApi.updateCustomer);
export const useDeleteCustomer = () => useCustomerMutation(customersApi.deleteCustomer);
