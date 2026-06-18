"use client";

import { useState, useMemo } from "react";
import { Search, Users, Handshake, CheckCheck } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
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
import { formatCurrency } from "@/lib/utils";
import { PayableKind } from "@/types";

const PAGE_SIZE = 30;

export default function PayablesPage() {
  const [tab, setTab] = useState<PayableKind>("DRIVER");
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const params = useMemo(
    () => ({
      kind: tab,
      status: status || undefined,
      search: search || undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [tab, status, search, page],
  );

  const { data, isLoading } = usePayables(params);
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
    if (selected.size === 0) return;
    await bulk.mutateAsync({ ids: Array.from(selected) });
    setSelected(new Set());
  }

  return (
    <DashboardShell title="Tagihan (Debts)">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => switchTab("DRIVER")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === "DRIVER"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Users className="h-4 w-4" /> Tagihan Driver
          </button>
          <button
            onClick={() => switchTab("VENDOR")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === "VENDOR"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Handshake className="h-4 w-4" /> Tagihan Vendor
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs font-medium text-amber-700">
              Outstanding (Belum Dibayar)
            </p>
            <p className="mt-1 text-xl font-bold text-amber-900">
              {formatCurrency(totals.outstanding)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-medium text-emerald-700">
              Sudah Dibayar (filtered)
            </p>
            <p className="mt-1 text-xl font-bold text-emerald-900">
              {formatCurrency(totals.paid)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search name, order code, keterangan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All status</SelectItem>
              <SelectItem value="UNPAID">Belum dibayar</SelectItem>
              <SelectItem value="PAID">Lunas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Batch action bar */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
            <span className="text-sm font-medium text-emerald-800">
              {selected.size} dipilih · {formatCurrency(selectedTotal)}
            </span>
            <Button
              size="sm"
              className="gap-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={bulk.isPending}
              onClick={paySelected}
            >
              <CheckCheck className="h-4 w-4" />
              {bulk.isPending ? "Memproses..." : "Bayar Terpilih"}
            </Button>
          </div>
        )}

        {/* Table */}
        <PayablesTable
          items={items}
          kind={tab}
          loading={isLoading}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />

        {data?.pagination && data.pagination.page_count > 1 && (
          <TablePagination
            page={data.pagination.page}
            pageCount={data.pagination.page_count}
            total={data.pagination.total}
            start={(data.pagination.page - 1) * PAGE_SIZE}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            label="tagihan"
          />
        )}
      </div>
    </DashboardShell>
  );
}
