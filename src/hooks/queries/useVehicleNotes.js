import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as vehicleNotesApi from "../../api/vehicleNotesApi";

export const vehicleNotesKey = ["vehicle-notes"];

export function useVehicleNotesQuery() {
  return useQuery({
    queryKey: vehicleNotesKey,
    queryFn: vehicleNotesApi.fetchVehicleNotes,
  });
}

// One vehicle, for the detail page. Lives under the list's key prefix, so every
// mutation below (which invalidates ["vehicle-notes"]) refreshes it too. If the
// person came from the list, that cached copy is shown instantly while the
// full record loads.
export function useVehicleNoteQuery(id) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...vehicleNotesKey, id],
    queryFn: () => vehicleNotesApi.fetchVehicleNote(id),
    enabled: Boolean(id),
    placeholderData: () => queryClient.getQueryData(vehicleNotesKey)?.find((v) => v._id === id),
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

export function useAddVehicleGalleryPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehicleNotesApi.addVehicleGalleryPhoto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleNotesKey }),
  });
}

export function useRemoveVehicleGalleryPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehicleNotesApi.removeVehicleGalleryPhoto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleNotesKey }),
  });
}

// Internal staff notes & comments (content-management layer for Vehicle
// Notes) — timestamped, attributed to the staff member who wrote them.
export function useAddVehicleStaffNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehicleNotesApi.addVehicleStaffNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleNotesKey }),
  });
}

export function useRemoveVehicleStaffNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehicleNotesApi.removeVehicleStaffNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleNotesKey }),
  });
}
