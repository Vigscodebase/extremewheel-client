import { useQuery } from "@tanstack/react-query";
import * as appGuideApi from "../../api/appGuideApi";

// Each level only fetches once its parent selection is made — keeps the
// dropdowns cascading instead of firing every request up front, and lets
// React Query cache each (year), (year, make), (year, make, model) slice
// independently as the user browses.
export function useAppGuideYears() {
  return useQuery({
    queryKey: ["app-guide", "years"],
    queryFn: appGuideApi.fetchAppGuideYears,
  });
}

export function useAppGuideMakes(year) {
  return useQuery({
    queryKey: ["app-guide", "makes", year],
    queryFn: () => appGuideApi.fetchAppGuideMakes(year),
    enabled: Boolean(year),
  });
}

export function useAppGuideModels(year, make) {
  return useQuery({
    queryKey: ["app-guide", "models", year, make],
    queryFn: () => appGuideApi.fetchAppGuideModels(year, make),
    enabled: Boolean(year && make),
  });
}

export function useAppGuideTypes(year, make, model) {
  return useQuery({
    queryKey: ["app-guide", "types", year, make, model],
    queryFn: () => appGuideApi.fetchAppGuideTypes(year, make, model),
    enabled: Boolean(year && make && model),
  });
}

export function useAppGuideFitment(year, make, model, type, option) {
  return useQuery({
    queryKey: ["app-guide", "fitment", year, make, model, type, option],
    queryFn: () => appGuideApi.fetchAppGuideFitment(year, make, model, type, option),
    enabled: Boolean(year && make && model && type),
  });
}
