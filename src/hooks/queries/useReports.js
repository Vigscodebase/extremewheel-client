import { useMutation, useQuery } from "@tanstack/react-query";
import * as reportsApi from "../../api/reportsApi";

export function useReportsSummary({ from, to }) {
  return useQuery({
    queryKey: ["reports", "summary", from, to],
    queryFn: () => reportsApi.fetchReportsSummary({ from, to }),
  });
}

export function useDownloadReportCsv() {
  return useMutation({
    mutationFn: reportsApi.downloadReportCsv,
  });
}
