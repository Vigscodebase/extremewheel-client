import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as vehicleNotesApi from "../../api/vehicleNotesApi";

export const vehicleNotesKey = ["vehicle-notes"];

export function useVehicleNotesQuery() {
  return useQuery({
    queryKey: vehicleNotesKey,
    queryFn: vehicleNotesApi.fetchVehicleNotes,
  });
}

export function useCreateVehicleNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehicleNotesApi.createVehicleNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleNotesKey }),
  });
}

export function useUpdateVehicleNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehicleNotesApi.updateVehicleNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleNotesKey }),
  });
}

export function useDeleteVehicleNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehicleNotesApi.deleteVehicleNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleNotesKey }),
  });
}
