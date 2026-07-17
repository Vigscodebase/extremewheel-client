import { useMutation } from "@tanstack/react-query";
import * as plusSizeApi from "../../api/plusSizeApi";

export function usePlusSizeSearch() {
  return useMutation({
    mutationFn: plusSizeApi.searchPlusSize,
  });
}
