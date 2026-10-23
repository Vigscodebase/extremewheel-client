import { useMutation } from "@tanstack/react-query";
import * as savedComparisonsApi from "../../api/savedComparisonsApi";

// No list is shown anywhere yet, so there is no query cache to invalidate.
export function useCreateSavedComparison() {
  return useMutation({
    mutationFn: savedComparisonsApi.createSavedComparison,
  });
}
