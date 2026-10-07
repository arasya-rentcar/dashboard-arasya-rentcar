"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, TrendingUp, Loader2 } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import QueryError from "@/components/dashboard/QueryError";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { formatCurrency, isoToWibDate } from "@/lib/utils";
import { useRevenueReport } from "@/hooks/useAnalytics";

// Wide report tables scroll sideways on phones/tablets: keep the first column
// (unit / vendor / driver) pinned so a row's figures stay identifiable. Rows
// carry an opaque background that the pinned cell inherits. The scroller
// (CardContent px-0) has no padding, because a pinned cell sticks to the
// padding edge and scrolled figures showed through the gap; the outer
// columns carry the card inset instead.
const STICKY_FIRST_COL =
  "[&_tr>*:first-child]:sticky [&_tr>*:first-child]:left-0 [&_tr>*:first-child]:z-[1] [&_tr>*:first-child]:bg-inherit [&_tr>*:first-child]:shadow-[1px_0_0_0_rgb(243,244,246)] [&_tr>*:first-child]:pl-6 [&_tr>*:last-child]:pr-6";

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

// The month in WIB, not in the browser timezone (an admin abroad, or a
// laptop on UTC, would otherwise open the wrong month around midnight).
function currentMonth() {
  return isoToWibDate(new Date().toISOString()).slice(0, 7);
}

export default function RevenuePage() {
  const t = useTranslations("revenue");
  const tt = useTranslations("terms");
  const tc = useTranslations("common");
  const [month, setMonth] = useState(currentMonth());
  const { from, to } = useMemo(() => monthBounds(month), [month]);
  const { data, isLoading, isError, isFetching, refetch } = useRevenueReport({
    date_from: from,
    date_to: to,
  });
  const [openVendor, setOpenVendor] = useState<string | null>(null);

  const A = data?.internal_cars;
  const B = data?.vendor_margin;

  return (
    <DashboardShell title={t("title")}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-gray-500">
              <TrendingUp className="mr-2 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
              {t("intro")} <b>{t("introFinal")}</b> = {t("introFinalDesc")},{" "}
              <b>{t("introEstimated")}</b> = {t("introEstimatedDesc")}.
            </p>
          </div>
          <div className="shrink-0 space-y-1.5">
            <Label htmlFor="revenue-month" className="text-xs text-gray-500">{t("month")}</Label>
            <Input
              id="revenue-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value || currentMonth())}
              className="w-full sm:w-44"
            />
          </div>
        </div>

        {isError ? (
          <QueryError onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="flex items-center gap-2 py-16 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> {tc("loading")}
          </div>
        ) : (
          <>
            {/* ── Order count KPI strip ────────────────────────────────── */}
            {data?.order_counts && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">
                        {t("kpiTotalOrders")}
                      </p>
                      <p className="text-2xl font-bold tabular-nums text-gray-900">
                        {data.order_counts.total}
                      </p>
                    </div>
                    <div className="hidden h-10 w-px bg-gray-200 sm:block" aria-hidden="true" />
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-blue-600">{tt("internal")}</p>
                      <p className="text-xl font-semibold tabular-nums text-blue-700">
                        {data.order_counts.internal}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-purple-600">{tt("vendor")}</p>
                      <p className="text-xl font-semibold tabular-nums text-purple-700">
                        {data.order_counts.vendor}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-amber-700">{tt("freelance")}</p>
                      <p className="text-xl font-semibold tabular-nums text-amber-700">
                        {data.order_counts.freelance}
                      </p>
                    </div>
                    <div className="hidden h-10 w-px bg-gray-200 sm:block" aria-hidden="true" />
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">{t("kpiExternalTotal")}</p>
                      <p className="text-xl font-semibold tabular-nums text-gray-700">
                        {data.order_counts.external_total}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-gray-400">
                    {t("kpiNote")}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ── Section A — Internal cars ────────────────────────────── */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">
                  {t("sectionInternalTitle")}
                </CardTitle>
                {isFetching && (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                )}
              </CardHeader>
              <CardContent className="overflow-x-auto px-0">
                <table className={`w-full min-w-[960px] text-sm ${STICKY_FIRST_COL}`}>
                  <thead>
                    <tr className="border-b bg-white text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-3">{t("colUnit")}</th>
                      <th className="py-2 px-3 text-right">{t("colGrossFinal")}</th>
                      <th className="py-2 px-3 text-right">{tt("opsCost")}</th>
                      <th className="py-2 px-3 text-right">{tt("driverFee")}</th>
                      <th className="py-2 px-3 text-right">{tt("netMargin")}</th>
                      <th className="py-2 px-3 text-right">{tt("orders")}</th>
                      <th className="py-2 px-3 text-right">{tt("trips")}</th>
                      <th className="py-2 px-3 text-right text-amber-600">
                        {t("colGrossEst")}
                      </th>
                      <th className="py-2 pl-3 text-right text-amber-600">
                        {t("colMarginEst")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {A?.rows.length ? (
                      A.rows.map((r) => (
                        <tr
                          key={r.car_id ?? "unassigned"}
                          className="border-b bg-white last:border-0"
                        >
                          <td className="min-w-[9rem] max-w-[11rem] py-2.5 pr-3 sm:max-w-none">
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
                          <td className="px-3 text-right tabular-nums text-gray-500">
                            {formatCurrency(r.final.driver_fee)}
                          </td>
                          <td className="px-3 text-right font-medium tabular-nums text-emerald-700">
                            {moneyOrDash(r.final.net_margin)}
                          </td>
                          <td className="px-3 text-right tabular-nums text-blue-700">
                            {r.final.orders}
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
                        <td colSpan={9} className="py-8 text-center text-gray-400">
                          {t("emptyInternal")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {A?.rows.length ? (
                    <tfoot>
                      <tr className="border-t-2 bg-white font-semibold">
                        <td className="py-2.5 pr-3">{tc("total")}</td>
                        <td className="px-3 text-right tabular-nums">
                          {formatCurrency(A.totals.final.gross)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-gray-500">
                          {formatCurrency(A.totals.final.ops)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-gray-500">
                          {formatCurrency(A.totals.final.driver_fee)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-emerald-700">
                          {formatCurrency(A.totals.final.net_margin)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-blue-700">
                          {A.totals.final.orders}
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
                  {t("sectionVendorTitle")}
                </CardTitle>
                <p className="text-xs text-gray-500">
                  {t("sectionVendorNote")}
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto px-0">
                <table className={`w-full min-w-[920px] text-sm ${STICKY_FIRST_COL}`}>
                  <thead>
                    <tr className="border-b bg-white text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-3">{t("colVendor")}</th>
                      <th className="py-2 px-3 text-right">{t("colBilledFinal")}</th>
                      <th className="py-2 px-3 text-right">{t("colVendorCost")}</th>
                      <th className="py-2 px-3 text-right">{tt("margin")}</th>
                      <th className="py-2 px-3 text-right">{tt("orders")}</th>
                      <th className="py-2 px-3 text-right">{tt("trips")}</th>
                      <th className="py-2 pl-3 text-right text-amber-600">
                        {t("colMarginEst")}
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
                              className="cursor-pointer border-b bg-white last:border-0 hover:bg-gray-50"
                              onClick={() =>
                                setOpenVendor(open ? null : key)
                              }
                            >
                              <td className="py-2.5 pr-3">
                                {/* The click bubbles to the row, which toggles it. */}
                                <button
                                  type="button"
                                  aria-expanded={open}
                                  className="flex items-center gap-1.5 rounded text-left font-medium text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                                >
                                  {open ? (
                                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                                  )}
                                  {v.vendor_name}
                                  {v.vendor_id == null && (
                                    <Badge
                                      variant="outline"
                                      className="ml-1 text-[10px] text-amber-700 border-amber-200 bg-amber-50"
                                    >
                                      {t("badgeFreelance")}
                                    </Badge>
                                  )}
                                </button>
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
                              <td className="px-3 text-right tabular-nums text-blue-700">
                                {v.final.orders}
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
                                  className="border-b bg-gray-50 text-xs last:border-0"
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
                                  <td className="px-3 text-right tabular-nums text-blue-700">
                                    {u.final.orders}
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
                        <td colSpan={7} className="py-8 text-center text-gray-400">
                          {t("emptyVendor")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {B?.rows.length ? (
                    <tfoot>
                      <tr className="border-t-2 bg-white font-semibold">
                        <td className="py-2.5 pr-3">{tc("total")}</td>
                        <td className="px-3 text-right tabular-nums">
                          {formatCurrency(B.totals.final.customer_billed)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-gray-500">
                          {formatCurrency(B.totals.final.vendor_cost)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-emerald-700">
                          {formatCurrency(B.totals.final.arasya_margin)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-blue-700">
                          {B.totals.final.orders}
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

            {/* ── Order-level income (not per unit) ─────────────────── */}
            {data?.order_level && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("orderLevelTitle")}
                  </CardTitle>
                  <p className="text-xs text-gray-500">{t("orderLevelNote")}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid max-w-xl grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
                    <span className="text-gray-600">{t("orderLevelCharges")}</span>
                    <span className="text-right tabular-nums text-gray-900">
                      {formatCurrency(data.order_level.extra_charges)}
                    </span>
                    <span className="text-gray-600">{t("orderLevelCancellation")}</span>
                    <span className="text-right tabular-nums text-gray-900">
                      {formatCurrency(data.order_level.cancellation_income)}
                    </span>
                    <span className="text-xs text-gray-400">{t("orderLevelPassThrough")}</span>
                    <span className="text-right text-xs tabular-nums text-gray-400">
                      {formatCurrency(data.order_level.pass_through)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Section C — Driver Fee Report ─────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("sectionDriverTitle")}
                </CardTitle>
                <p className="text-xs text-gray-500">
                  {t("sectionDriverNote")}{" "}
                  <b className="text-emerald-700">{tt("paid")}</b>{" "}
                  {t("driverNotePaid")},{" "}
                  <b className="text-amber-700">{tt("outstanding")}</b>{" "}
                  {t("driverNoteOutstanding")}.
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto px-0">
                <table className={`w-full min-w-[760px] text-sm ${STICKY_FIRST_COL}`}>
                  <thead>
                    <tr className="border-b bg-white text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-3">{t("colDriver")}</th>
                      <th className="py-2 px-3 text-right">{t("colTotalFee")}</th>
                      <th className="py-2 px-3 text-right text-emerald-700">{tt("paid")}</th>
                      <th className="py-2 px-3 text-right text-amber-700">{tt("outstanding")}</th>
                      <th className="py-2 px-3 text-right">{tt("orders")}</th>
                      <th className="py-2 pl-3 text-right">{tt("trips")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.driver_fees.rows.length ? (
                      data.driver_fees.rows.map((d) => (
                        <tr
                          key={d.driver_id ?? d.driver_name}
                          className="border-b bg-white last:border-0"
                        >
                          <td className="py-2.5 pr-3">
                            <div className="font-medium text-gray-900">
                              {d.driver_name}
                            </div>
                            {d.driver_phone && (
                              <div className="text-xs text-gray-400">
                                {d.driver_phone}
                              </div>
                            )}
                          </td>
                          <td className="px-3 text-right font-medium tabular-nums text-gray-900">
                            {formatCurrency(d.fee_total)}
                          </td>
                          <td className="px-3 text-right tabular-nums text-emerald-700">
                            {formatCurrency(d.fee_paid)}
                          </td>
                          <td className="px-3 text-right tabular-nums text-amber-700">
                            {formatCurrency(d.fee_pending)}
                          </td>
                          <td className="px-3 text-right tabular-nums text-blue-700">
                            {d.orders}
                          </td>
                          <td className="pl-3 text-right tabular-nums text-gray-500">
                            {d.trips}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          {t("emptyDriver")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {data?.driver_fees.rows.length ? (
                    <tfoot>
                      <tr className="border-t-2 bg-white font-semibold">
                        <td className="py-2.5 pr-3">{tc("total")}</td>
                        <td className="px-3 text-right tabular-nums text-gray-900">
                          {formatCurrency(data.driver_fees.totals.fee_total)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-emerald-700">
                          {formatCurrency(data.driver_fees.totals.fee_paid)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-amber-700">
                          {formatCurrency(data.driver_fees.totals.fee_pending)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-blue-700">
                          {data.driver_fees.totals.orders}
                        </td>
                        <td className="pl-3 text-right tabular-nums text-gray-500">
                          {data.driver_fees.totals.trips}
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
