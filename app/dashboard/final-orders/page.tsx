"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, RefreshCw, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";
import DashboardShell from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFinalOrders, usePreviewSheetImport, useRunSheetImport } from "@/hooks/useFinalOrders";
import TablePagination, { usePagination } from "@/components/dashboard/TablePagination";
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";

function money(value?: string | null) {
  if (value === null || value === undefined || value === "") return "-";
  return formatCurrency(Number(value));
}

function rawDate(parsed?: string | null, raw?: string | null) {
  if (parsed) return formatDate(parsed);
  return raw || "-";
}

export default function FinalOrdersPage() {
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [checkedFilter, setCheckedFilter] = useState("ALL");
  const [assignFilter, setAssignFilter] = useState("ALL");
  const [marginFilter, setMarginFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data: orders, isLoading } = useFinalOrders();
  const previewMutation = usePreviewSheetImport();
  const importMutation = useRunSheetImport();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (orders || []).filter((order) => {
      const finance = order.final_finance;
      const matchSearch =
        q === "" ||
        [
          order.customer_name,
          order.order_code,
          finance?.invoice_no_raw,
          finance?.driver_vendor_raw,
          finance?.vehicle_raw,
          finance?.route_raw,
          finance?.plate_no_raw,
          finance?.package_raw,
          finance?.duration_raw,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));

      const matchPayment =
        paymentFilter === "ALL" || order.payment_status === paymentFilter;

      const isChecked = finance?.sheet_checked_raw === "TRUE";
      const matchChecked =
        checkedFilter === "ALL" ||
        (checkedFilter === "CHECKED" ? isChecked : !isChecked);

      const hasDriver = !!finance?.driver_vendor_raw?.trim();
      const matchAssign =
        assignFilter === "ALL" ||
        (assignFilter === "ASSIGNED" ? hasDriver : !hasDriver);

      const hasMargin =
        finance?.margin_amount !== null &&
        finance?.margin_amount !== undefined &&
        finance?.margin_amount !== "";
      const matchMargin =
        marginFilter === "ALL" ||
        (marginFilter === "HAS" ? hasMargin : !hasMargin);

      const refRaw = finance?.service_date || order.order_date;
      const ref = refRaw ? new Date(refRaw) : null;
      const matchFrom =
        !dateFrom || (ref && ref >= new Date(`${dateFrom}T00:00:00`));
      const matchTo =
        !dateTo || (ref && ref <= new Date(`${dateTo}T23:59:59`));

      return (
        matchSearch &&
        matchPayment &&
        matchChecked &&
        matchAssign &&
        matchMargin &&
        matchFrom &&
        matchTo
      );
    });
  }, [
    orders,
    search,
    paymentFilter,
    checkedFilter,
    assignFilter,
    marginFilter,
    dateFrom,
    dateTo,
  ]);

  const hasActiveFilter =
    search !== "" ||
    paymentFilter !== "ALL" ||
    checkedFilter !== "ALL" ||
    assignFilter !== "ALL" ||
    marginFilter !== "ALL" ||
    dateFrom !== "" ||
    dateTo !== "";

  function clearFilters() {
    setSearch("");
    setPaymentFilter("ALL");
    setCheckedFilter("ALL");
    setAssignFilter("ALL");
    setMarginFilter("ALL");
    setDateFrom("");
    setDateTo("");
  }

  const PAGE_SIZE = 10;
  const { page, setPage, pageCount, total, start, pageItems } = usePagination(
    filtered,
    PAGE_SIZE,
  );

  async function handlePreview() {
    try {
      const data = await previewMutation.mutateAsync({});
      toast.success(`Preview: ${data.meaningful_rows} order rows, ${data.warning_count} warnings`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleImport() {
    try {
      const data = await importMutation.mutateAsync({});
      toast.success(`Imported ${data.imported}, updated ${data.updated}, warnings ${data.warning_count}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <DashboardShell title="Final Orders">
      <div className="space-y-4">
        <Card className="shadow-none border border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Google Sheet Import</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-gray-600">
              Import real Arasya final-order rows. One meaningful sheet row becomes one dashboard order.
              Invoice numbers can duplicate; source row number is preserved.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePreview} disabled={previewMutation.isPending}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleImport} disabled={importMutation.isPending}>
                {importMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Import Sheet
              </Button>
            </div>
          </CardContent>
        </Card>

        {(previewMutation.data || importMutation.data) && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {previewMutation.data && (
              <>
                <Summary label="Preview rows" value={previewMutation.data.meaningful_rows} />
                <Summary label="Skipped" value={previewMutation.data.skipped_rows} />
                <Summary label="Warnings" value={previewMutation.data.warning_count} />
              </>
            )}
            {importMutation.data && (
              <>
                <Summary label="Imported" value={importMutation.data.imported} />
                <Summary label="Updated" value={importMutation.data.updated} />
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search invoice, customer, driver, car, route, package…"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="text-xs text-gray-400">{filtered.length} final order rows</div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Payment</label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Payment</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
                <SelectItem value="DP_PAID">DP Paid</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Checked</label>
            <Select value={checkedFilter} onValueChange={setCheckedFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="CHECKED">Checked</SelectItem>
                <SelectItem value="UNCHECKED">Unchecked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Driver</label>
            <Select value={assignFilter} onValueChange={setAssignFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="ASSIGNED">Has Driver</SelectItem>
                <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Margin</label>
            <Select value={marginFilter} onValueChange={setMarginFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="HAS">Has Margin</SelectItem>
                <SelectItem value="NONE">No Margin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">From</label>
            <Input
              type="date"
              className="w-40"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">To</label>
            <Input
              type="date"
              className="w-40"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          {hasActiveFilter && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-none overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-12">No</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Car</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Driver/Vendor</TableHead>
                <TableHead>Nopol</TableHead>
                <TableHead className="text-right">Total User</TableHead>
                <TableHead className="text-right">Ops Cost</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(14)].map((__, j) => (
                      <TableCell key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-10 text-gray-400 text-sm">
                    No final orders yet. Use Preview/Import to load the sheet.
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((order, idx) => {
                  const finance = order.final_finance;
                  const source = order.sheet_import_rows?.[0];
                  return (
                    <TableRow key={order.id} className="hover:bg-gray-50/50">
                      <TableCell className="text-sm text-gray-400 tabular-nums">{start + idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant="outline" className={order.payment_status === "PAID" ? "bg-emerald-50 text-emerald-700" : order.payment_status === "DP_PAID" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}>
                            {order.payment_status.replace("_", " ")}
                          </Badge>
                          {finance?.sheet_checked_raw === "TRUE" && <Badge variant="outline">Checked</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{finance?.invoice_no_raw || order.order_code || "-"}</TableCell>
                      <TableCell>{rawDate(finance?.service_date, finance?.service_date_raw)}</TableCell>
                      <TableCell className="font-medium">{order.customer_name}</TableCell>
                      <TableCell>{finance?.vehicle_raw || "-"}</TableCell>
                      <TableCell className="max-w-48 truncate">{finance?.route_raw || "-"}</TableCell>
                      <TableCell>{finance?.driver_vendor_raw || <span className="text-gray-400">Unassigned</span>}</TableCell>
                      <TableCell>{finance?.plate_no_raw || "-"}</TableCell>
                      <TableCell className="text-right">{money(finance?.total_user_amount || order.final_price)}</TableCell>
                      <TableCell className="text-right">{money(finance?.total_ops_cost)}</TableCell>
                      <TableCell className="text-right">{money(finance?.margin_amount)}</TableCell>
                      <TableCell className="text-xs text-gray-500">{source ? `row ${source.row_number}` : "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/orders/${order.id}`}>Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          page={page}
          pageCount={pageCount}
          total={total}
          start={start}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="final order rows"
        />
      </div>
    </DashboardShell>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <Card className="shadow-none border border-gray-200">
      <CardContent className="p-4">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}
