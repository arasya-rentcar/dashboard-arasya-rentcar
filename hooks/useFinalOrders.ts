import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { finalOrdersApi, sheetImportsApi } from "@/lib/api";
import { FinalOrderListItem, SheetImportPreview, SheetImportResult } from "@/types";

export function useFinalOrders() {
  return useQuery<FinalOrderListItem[]>({
    queryKey: ["final-orders"],
    queryFn: async () => {
      const res = await finalOrdersApi.list();
      return res.data.data;
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: ["final-orders"] });
    },
  });
}
