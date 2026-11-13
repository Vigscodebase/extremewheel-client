import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as vehicleNotesApi from "../../api/vehicleNotesApi";
import useCursorPagination from "./useCursorPagination";
import useSuggestions from "./useSuggestions";

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
    placeholderData: () => {
      const fromList = queryClient.getQueryData(vehicleNotesKey)?.find((v) => v._id === id);
      if (fromList) return fromList;
      // Otherwise reuse the card from any cached page of the paginated list.
      for (const [, page] of queryClient.getQueriesData({ queryKey: [...vehicleNotesKey, "page"] })) {
        const hit = page?.items?.find((v) => v._id === id);
        if (hit) return hit;
      }
      return undefined;
    },
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

// Paginated + searchable cards for the Vehicle Notes page (20 per page, cursor
// based). The full-list hook above stays for Tech Data.
export const VEHICLE_NOTES_PAGE_SIZE = 20;

export const useVehicleNotesPage = (params) =>
  useCursorPagination({
    queryKey: vehicleNotesKey,
    fetchPage: vehicleNotesApi.fetchVehicleNotesPage,
    params,
    pageSize: VEHICLE_NOTES_PAGE_SIZE,
  });

export const useVehicleNoteSuggestions = (text, enabled = true) =>
  useSuggestions({ queryKey: vehicleNotesKey, fetchSuggestions: vehicleNotesApi.fetchVehicleNoteSuggestions, text, enabled });
