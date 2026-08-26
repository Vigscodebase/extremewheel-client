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

// Independent of make/model/type (see models/VehicleLookupYear.js) — always
// enabled, no parent selection required.
export function useVehicleLookupYears() {
  return useQuery({
    queryKey: ["vehicle-lookup", "years"],
    queryFn: vehicleLookupApi.fetchVehicleLookupYears,
  });
}

// "+ Add new…" on the Add/Edit vehicle form calls these on save so a
// freshly-typed Make/Model/Type/Year becomes a real dropdown option from
// then on. Invalidates the same ["vehicle-lookup"] cache as the bulk
// import/export mutations below, so every open dropdown picks up the
// addition next time it's opened.
export function useQuickAddVehicleLookup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ make, model, type }) => vehicleLookupApi.quickAddVehicleLookup(make, model, type),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicle-lookup"] }),
  });
}

export function useQuickAddVehicleLookupYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (year) => vehicleLookupApi.quickAddVehicleLookupYear(year),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicle-lookup"] }),
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
