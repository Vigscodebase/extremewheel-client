import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as vehicleLookupApi from "../../api/vehicleLookupApi";

// Cascading Make -> Model -> Type dropdown data, same pattern as
// useAppGuide.js's Year -> Make -> Model -> Type chain: each level only
// fetches once its parent is selected, and React Query caches each slice
// independently.
export function useVehicleLookupMakes() {
  return useQuery({
    queryKey: ["vehicle-lookup", "makes"],
    queryFn: vehicleLookupApi.fetchVehicleLookupMakes,
  });
}

export function useVehicleLookupModels(make) {
  return useQuery({
    queryKey: ["vehicle-lookup", "models", make],
    queryFn: () => vehicleLookupApi.fetchVehicleLookupModels(make),
    enabled: Boolean(make),
  });
}

export function useVehicleLookupTypes(make, model) {
  return useQuery({
    queryKey: ["vehicle-lookup", "types", make, model],
    queryFn: () => vehicleLookupApi.fetchVehicleLookupTypes(make, model),
    enabled: Boolean(make && model),
  });
}

export function useDownloadVehicleLookupXlsx() {
  return useMutation({
    mutationFn: vehicleLookupApi.downloadVehicleLookupXlsx,
  });
}

export function useImportVehicleLookupXlsx() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehicleLookupApi.importVehicleLookupXlsx,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicle-lookup"] }),
  });
}
