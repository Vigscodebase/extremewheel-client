import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "../../api/dashboardApi";

export const dashboardKey = ["dashboard-summary"];

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKey,
    queryFn: fetchDashboardSummary,
    staleTime: 30_000,
    refetchInterval: 60_000, // keep KPIs reasonably live without hammering the API
  });
}
