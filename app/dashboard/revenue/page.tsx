"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, TrendingUp, Loader2 } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useRevenueReport } from "@/hooks/useAnalytics";

function moneyOrDash(v: number | null) {
  return v == null ? "—" : formatCurrency(v);
}

// Current WIB month as YYYY-MM-DD bounds for the default range.
function monthBounds(month: string) {
  // month = "YYYY-MM"
  const [y, m] = month.split("-").map(Number);
  const from = `${month}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${month}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function RevenuePage() {
  const [month, setMonth] = useState(currentMonth());
  const { from, to } = useMemo(() => monthBounds(month), [month]);
  const { data, isLoading, isFetching } = useRevenueReport({
    date_from: from,
    date_to: to,
  });
  const [openVendor, setOpenVendor] = useState<string | null>(null);

  const A = data?.internal_cars;
  const B = data?.vendor_margin;

  return (
    <DashboardShell title="Revenue">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <TrendingUp className="h-4 w-4" />
              Pendapatan per unit internal + margin vendor. Basis tanggal
              layanan (WIB). <b>Final</b> = order selesai, <b>Estimasi</b> =
              order masih berjalan.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Bulan</Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value || currentMonth())}
              className="w-44"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-16 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
          </div>
        ) : (
          <>
            {/* ── Section A — Internal cars ────────────────────────────── */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  Internal Cars — Revenue per Unit
                </CardTitle>
                {isFetching && (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                )}
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-3">Unit</th>
                      <th className="py-2 px-3 text-right">Gross (Final)</th>
                      <th className="py-2 px-3 text-right">Ops</th>
                      <th className="py-2 px-3 text-right">Net Margin</th>
                      <th className="py-2 px-3 text-right">Trips</th>
                      <th className="py-2 px-3 text-right text-amber-600">
                        Gross (Est.)
                      </th>
                      <th className="py-2 pl-3 text-right text-amber-600">
                        Margin (Est.)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {A?.rows.length ? (
                      A.rows.map((r) => (
                        <tr
                          key={r.car_id ?? "unassigned"}
                          className="border-b last:border-0"
                        >
                          <td className="py-2.5 pr-3">
                            <div className="font-medium text-gray-900">
                              {r.car_label}
                            </div>
                            <div className="text-xs text-gray-400">
                              {r.plate || "—"}
                              {r.unit_code ? ` · #${r.unit_code}` : ""}
                            </div>
                          </td>
                          <td className="px-3 text-right tabular-nums">
                            {formatCurrency(r.final.gross)}
                          </td>
                          <td className="px-3 text-right tabular-nums text-gray-500">
                            {formatCurrency(r.final.ops)}
                          </td>
                          <td className="px-3 text-right font-medium tabular-nums text-emerald-700">
                            {moneyOrDash(r.final.net_margin)}
                          </td>
                          <td className="px-3 text-right tabular-nums text-gray-500">
                            {r.final.trips}
                          </td>
                          <td className="px-3 text-right tabular-nums text-amber-600">
                            {formatCurrency(r.estimated.gross)}
                          </td>
                          <td className="pl-3 text-right tabular-nums text-amber-600">
                            {moneyOrDash(r.estimated.net_margin)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-400">
                          Belum ada line internal di bulan ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {A?.rows.length ? (
                    <tfoot>
                      <tr className="border-t-2 font-semibold">
                        <td className="py-2.5 pr-3">Total</td>
                        <td className="px-3 text-right tabular-nums">
                          {formatCurrency(A.totals.final.gross)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-gray-500">
                          {formatCurrency(A.totals.final.ops)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-emerald-700">
                          {formatCurrency(A.totals.final.net_margin)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-gray-500">
                          {A.totals.final.trips}
                        </td>
                        <td className="px-3 text-right tabular-nums text-amber-600">
                          {formatCurrency(A.totals.estimated.gross)}
                        </td>
                        <td className="pl-3 text-right tabular-nums text-amber-600">
                          {formatCurrency(A.totals.estimated.net_margin)}
                        </td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </CardContent>
            </Card>

            {/* ── Section B — Vendor margin ────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Vendor Margin / Performance
                </CardTitle>
                <p className="text-xs text-gray-500">
                  Eksternal bersifat pass-through — &quot;revenue&quot; di sini =
                  markup Arasya atas biaya vendor (billed − vendor cost).
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-3">Vendor</th>
                      <th className="py-2 px-3 text-right">Billed (Final)</th>
                      <th className="py-2 px-3 text-right">Vendor Cost</th>
                      <th className="py-2 px-3 text-right">Margin</th>
                      <th className="py-2 px-3 text-right">Trips</th>
                      <th className="py-2 pl-3 text-right text-amber-600">
                        Margin (Est.)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {B?.rows.length ? (
                      B.rows.map((v) => {
                        const key = v.vendor_id ?? "freelance";
                        const open = openVendor === key;
                        return (
                          <Fragment key={key}>
                            <tr
                              className="cursor-pointer border-b last:border-0 hover:bg-gray-50"
                              onClick={() =>
                                setOpenVendor(open ? null : key)
                              }
                            >
                              <td className="py-2.5 pr-3">
                                <div className="flex items-center gap-1.5 font-medium text-gray-900">
                                  {open ? (
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                  )}
                                  {v.vendor_name}
                                  {v.vendor_id == null && (
                                    <Badge
                                      variant="outline"
                                      className="ml-1 text-[10px] text-amber-700 border-amber-200 bg-amber-50"
                                    >
                                      freelance
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 text-right tabular-nums">
                                {formatCurrency(v.final.customer_billed)}
                              </td>
                              <td className="px-3 text-right tabular-nums text-gray-500">
                                {formatCurrency(v.final.vendor_cost)}
                              </td>
                              <td className="px-3 text-right font-medium tabular-nums text-emerald-700">
                                {formatCurrency(v.final.arasya_margin)}
                              </td>
                              <td className="px-3 text-right tabular-nums text-gray-500">
                                {v.final.trips}
                              </td>
                              <td className="pl-3 text-right tabular-nums text-amber-600">
                                {formatCurrency(v.estimated.arasya_margin)}
                              </td>
                            </tr>
                            {open &&
                              v.units.map((u) => (
                                <tr
                                  key={key + (u.external_car_id ?? "nounit")}
                                  className="border-b bg-gray-50/50 text-xs last:border-0"
                                >
                                  <td className="py-2 pr-3 pl-9 text-gray-600">
                                    {u.car_label}
                                    {u.plate ? ` · ${u.plate}` : ""}
                                  </td>
                                  <td className="px-3 text-right tabular-nums">
                                    {formatCurrency(u.final.customer_billed)}
                                  </td>
                                  <td className="px-3 text-right tabular-nums text-gray-500">
                                    {formatCurrency(u.final.vendor_cost)}
                                  </td>
                                  <td className="px-3 text-right tabular-nums text-emerald-700">
                                    {formatCurrency(u.final.arasya_margin)}
                                  </td>
                                  <td className="px-3 text-right tabular-nums text-gray-500">
                                    {u.final.trips}
                                  </td>
                                  <td className="pl-3 text-right tabular-nums text-amber-600">
                                    {formatCurrency(u.estimated.arasya_margin)}
                                  </td>
                                </tr>
                              ))}
                          </Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          Belum ada order vendor/eksternal di bulan ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {B?.rows.length ? (
                    <tfoot>
                      <tr className="border-t-2 font-semibold">
                        <td className="py-2.5 pr-3">Total</td>
                        <td className="px-3 text-right tabular-nums">
                          {formatCurrency(B.totals.final.customer_billed)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-gray-500">
                          {formatCurrency(B.totals.final.vendor_cost)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-emerald-700">
                          {formatCurrency(B.totals.final.arasya_margin)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-gray-500">
                          {B.totals.final.trips}
                        </td>
                        <td className="pl-3 text-right tabular-nums text-amber-600">
                          {formatCurrency(B.totals.estimated.arasya_margin)}
                        </td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
