import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sheetImportsApi } from "@/lib/api";
import { SheetImportPreview, SheetImportResult } from "@/types";

export function usePreviewSheetImport() {
  return useMutation<SheetImportPreview, Error, object | undefined>({
    mutationFn: async (data = {}) => {
      const res = await sheetImportsApi.preview(data);
      return res.data.data;
    },
  });
}

export function useRunSheetImport() {
  const queryClient = useQueryClient();
  return useMutation<SheetImportResult, Error, object | undefined>({
    mutationFn: async (data = {}) => {
      const res = await sheetImportsApi.import(data);
      return res.data.data;
    },
    onSuccess: () => {
      // Imported rows land in the orders list.
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders-search"] });
    },
  });
}
