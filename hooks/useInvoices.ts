import { useQuery } from "@tanstack/react-query";
import { invoicesApi } from "@/lib/api";
import { parseResponse } from "@/lib/safeParse";
import { invoicesSearchResultSchema } from "@/lib/schemas";
import { Invoice, OrderListItem, PaginationMeta } from "@/types";

export type InvoiceWithOrder = Invoice & {
  order: Pick<
    OrderListItem,
    | "id"
    | "order_code"
    | "customer_name"
    | "customer_phone"
    | "payment_status"
    | "customers"
  >;
};

export interface InvoicesSearchParams {
  search?: string;
  status?: string;
  payment_status?: string;
  page?: number;
  page_size?: number;
}

export interface InvoicesSearchResult {
  data: InvoiceWithOrder[];
  pagination: PaginationMeta;
}

export function useInvoicesSearch(params: InvoicesSearchParams) {
  return useQuery<InvoicesSearchResult>({
    queryKey: ["invoices-search", params],
    queryFn: async () => {
      const res = await invoicesApi.search(
        params as Record<string, string | number | undefined>,
      );
      parseResponse(
        invoicesSearchResultSchema,
        { data: res.data.data, pagination: res.data.pagination },
        "useInvoicesSearch",
      );
      return {
        data: res.data.data as InvoiceWithOrder[],
        pagination: res.data.pagination as PaginationMeta,
      };
    },
    placeholderData: (prev) => prev,
  });
}
