"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Search, Users, Handshake, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import DashboardShell from "@/components/layout/DashboardShell";
import QueryError from "@/components/dashboard/QueryError";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TablePagination from "@/components/dashboard/TablePagination";
import PayablesTable from "@/components/payables/PayablesTable";
import { usePayables, useBulkMarkPaid } from "@/hooks/usePayables";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatCurrency, getErrorMessage } from "@/lib/utils";
import { PayableKind } from "@/types";

const PAGE_SIZE = 30;

export default function PayablesPage() {
  const t = useTranslations("payables");
  const [tab, setTab] = useState<PayableKind>("DRIVER");
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebouncedValue(search.trim());
  const params = useMemo(
    () => ({
      kind: tab,
      status: status || undefined,
      search: debouncedSearch || undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [tab, status, debouncedSearch, page],
  );

  // Reset to page 1 once the debounced search actually changes (not per key).
  const [lastSearch, setLastSearch] = useState(debouncedSearch);
  if (debouncedSearch !== lastSearch) {
    setLastSearch(debouncedSearch);
    setPage(1);
  }

  const { data, isLoading, isError, refetch } = usePayables(params);
  const bulk = useBulkMarkPaid();

  const items = data?.items ?? [];
  const totals = data?.totals ?? { outstanding: 0, paid: 0 };

  function switchTab(k: PayableKind) {
    setTab(k);
    setPage(1);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleAll(ids: string[]) {
    setSelected((s) => {
      const allOn = ids.length > 0 && ids.every((id) => s.has(id));
      return allOn ? new Set() : new Set(ids);
    });
  }

  const selectedTotal = items
    .filter((p) => selected.has(p.id))
    .reduce((sum, p) => sum + Number(p.total_amount), 0);

  async function paySelected() {
    if (selected.size === 0 || bulk.isPending) return;
    try {
      await bulk.mutateAsync({ ids: Array.from(selected) });
      setSelected(new Set());
    } catch (err) {
      // Was an unhandled rejection: the admin saw nothing when it failed.
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <DashboardShell title={t('pageTitle')}>
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2" role="group">
          <button
            type="button"
            aria-pressed={tab === "DRIVER"}
            onClick={() => switchTab("DRIVER")}
            className={`flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium ${
              tab === "DRIVER"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Users className="h-4 w-4" aria-hidden="true" /> {t('driverPayables')}
          </button>
          <button
            type="button"
            aria-pressed={tab === "VENDOR"}
            onClick={() => switchTab("VENDOR")}
            className={`flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium ${
              tab === "VENDOR"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Handshake className="h-4 w-4" aria-hidden="true" /> {t('vendorPayables')}
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="min-w-0 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 sm:px-4">
            <p className="text-xs font-medium text-amber-700">
              {t('outstandingLabel')}
            </p>
            <p className="mt-1 break-words text-base font-bold tabular-nums text-amber-900 sm:text-xl">
              {formatCurrency(totals.outstanding)}
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 sm:px-4">
            <p className="text-xs font-medium text-emerald-700">
              {t('paidFiltered')}
            </p>
            <p className="mt-1 break-words text-base font-bold tabular-nums text-emerald-900 sm:text-xl">
              {formatCurrency(totals.paid)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <Input
              aria-label={t('searchPlaceholder')}
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={status || "ALL"}
            onValueChange={(v) => {
              setStatus(v === "ALL" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label={t('colStatus')}>
              <SelectValue placeholder={t('colStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('allStatus')}</SelectItem>
              <SelectItem value="UNPAID">{t('statusUnpaid')}</SelectItem>
              <SelectItem value="PAID">{t('statusPaid')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Batch action bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
            <span className="text-sm font-medium text-emerald-800">
              {t('selectedSummary', { count: selected.size, amount: formatCurrency(selectedTotal) })}
            </span>
            <Button
              size="sm"
              className="gap-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={bulk.isPending}
              onClick={paySelected}
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              {bulk.isPending ? t('processing') : t('paySelected')}
            </Button>
          </div>
        )}

        {/* Table */}
        {isError ? (
          <QueryError onRetry={() => refetch()} />
        ) : (
          <PayablesTable
            items={items}
            kind={tab}
            loading={isLoading}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
          />
        )}

        {data?.pagination && data.pagination.page_count > 1 && (
          <TablePagination
            page={data.pagination.page}
            pageCount={data.pagination.page_count}
            total={data.pagination.total}
            start={(data.pagination.page - 1) * PAGE_SIZE}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            label={t('paginationLabel')}
          />
        )}
      </div>
    </DashboardShell>
  );
}
