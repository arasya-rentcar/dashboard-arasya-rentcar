"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, ExternalLink, CalendarCheck, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMarkPayablePaid } from "@/hooks/usePayables";
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import {
  PartnerDetailSummary,
  PartnerTripRow,
  Payable,
} from "@/types";

interface Props {
  kind: "DRIVER" | "VENDOR";
  summary: PartnerDetailSummary;
  trips: PartnerTripRow[];
  payments: Payable[];
}

// Line status -> key in the "scheduleLine" namespace (same labels as Schedule).
const LINE_STATUS_KEYS: Record<string, string> = {
  SCHEDULED: "statusScheduled",
  ASSIGNED: "statusAssigned",
  IN_PROGRESS: "statusInProgress",
  DONE: "statusDone",
  CANCELLED: "statusCancelled",
};

const LINE_STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  ASSIGNED: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  DONE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "amber" | "emerald" | "gray" | "blue";
}) {
  const styles = {
    amber: "border-amber-100 bg-amber-50 text-amber-900",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-900",
    blue: "border-blue-100 bg-blue-50 text-blue-900",
    gray: "border-gray-100 bg-gray-50 text-gray-900",
  }[accent ?? "gray"];
  return (
    <div className={`min-w-0 rounded-xl border px-3 py-3 sm:px-4 ${styles}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-1 break-words text-base font-bold tabular-nums sm:text-lg">{value}</p>
    </div>
  );
}

export default function PartnerDetailView({
  kind,
  summary,
  trips,
  payments,
}: Props) {
  const tx = useTranslations("partnerDetail");
  const tl = useTranslations("scheduleLine");
  const [tab, setTab] = useState<"trips" | "payments">("trips");
  const markPaid = useMarkPayablePaid();
  const earned =
    kind === "DRIVER" ? summary.total_earned : summary.total_billed;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label={tx('totalTrip')} value={String(summary.total_trips)} accent="blue" />
        <StatCard
          label={tx('completedTrip')}
          value={String(summary.completed_trips)}
          accent="gray"
        />
        <StatCard
          label={kind === "DRIVER" ? tx('totalFee') : tx('totalBilled')}
          value={formatCurrency(earned ?? 0)}
          accent="gray"
        />
        <StatCard
          label={tx('paid')}
          value={formatCurrency(summary.total_paid)}
          accent="emerald"
        />
        <StatCard
          label={tx('outstanding')}
          value={formatCurrency(summary.outstanding)}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <StatCard
          label={tx('revenueFromTrips')}
          value={formatCurrency(summary.revenue_generated)}
          accent="gray"
        />
        <StatCard
          label={tx('marginGenerated')}
          value={formatCurrency(summary.margin_generated)}
          accent="gray"
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={tab === "trips"}
          onClick={() => setTab("trips")}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "trips"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <CalendarCheck className="h-4 w-4" /> {tx('tripHistory', { count: trips.length })}
        </button>
        <button
          type="button"
          aria-pressed={tab === "payments"}
          onClick={() => setTab("payments")}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "payments"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Wallet className="h-4 w-4" /> {tx('paymentHistory', { count: payments.length })}
        </button>
      </div>

      {/* Trips tab */}
      {tab === "trips" && (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tx('colDate')}</TableHead>
                <TableHead>{tx('colOrder')}</TableHead>
                <TableHead>{tx('colCustomer')}</TableHead>
                <TableHead>{tx('colTrip')}</TableHead>
                <TableHead>{tx('colUnit')}</TableHead>
                <TableHead className="text-right">{tx('colRevenue')}</TableHead>
                <TableHead>{tx('colStatus')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-400">
                    {tx('noTrips')}
                  </TableCell>
                </TableRow>
              ) : (
                trips.map((t) => {
                  const car = t.car || t.external_car;
                  // Partner lines: the plate typed on the line wins over the
                  // vendor car's stored plate (same rule as the order page).
                  const plate = t.is_external
                    ? t.plate_raw || car?.plate_number
                    : car?.plate_number || t.plate_raw;
                  const unit = [car?.model, plate].filter(Boolean).join(" · ");
                  const partnerDriver = t.is_external
                    ? [t.driver_name_raw, t.driver_phone_raw]
                        .filter(Boolean)
                        .join(" · ")
                    : "";
                  const route = [t.pickup_location, t.dropoff_location]
                    .filter(Boolean)
                    .join(" → ");
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {t.service_date ? formatDate(t.service_date) : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.order?.order_code ? (
                          <Link
                            href={`/dashboard/orders/${t.order.id}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            {t.order.order_code}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="min-w-[10rem] max-w-[16rem] whitespace-normal text-sm text-gray-600">
                        {t.order?.customer_name || "-"}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm text-gray-600" title={route || undefined}>
                        {route || "-"}
                      </TableCell>
                      <TableCell className="min-w-[9rem] whitespace-normal text-sm text-gray-500">
                        {unit || "-"}
                        {partnerDriver && (
                          <p className="text-[11px] text-purple-700">
                            {tx("partnerDriver")}: {partnerDriver}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(t.total_price)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${LINE_STATUS_STYLES[t.line_status] ?? ""}`}
                        >
                          {LINE_STATUS_KEYS[t.line_status] ? tl(LINE_STATUS_KEYS[t.line_status]) : t.line_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Payments tab */}
      {tab === "payments" && (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tx('colDate')}</TableHead>
                <TableHead>{tx('colOrder')}</TableHead>
                <TableHead className="text-right">{tx('colBase')}</TableHead>
                <TableHead className="text-right">{tx('colOthers')}</TableHead>
                <TableHead className="text-right">{tx('colTotal')}</TableHead>
                <TableHead>{tx('colStatus')}</TableHead>
                <TableHead className="text-right">{tx('colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-400">
                    {tx('noPayables')}
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => {
                  const isPaid = p.status === "PAID";
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {p.service_date ? formatDate(p.service_date) : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.order?.order_code ? (
                          <Link
                            href={`/dashboard/orders/${p.order_id}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            {p.order.order_code}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(p.base_amount)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-500">
                        {Number(p.extras_amount) !== 0
                          ? formatCurrency(p.extras_amount)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {formatCurrency(p.total_amount)}
                      </TableCell>
                      <TableCell>
                        {isPaid ? (
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                            {tx('statusPaid')}
                            {p.paid_at ? ` · ${formatDate(p.paid_at)}` : ""}
                          </Badge>
                        ) : (
                          <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                            {tx('statusUnpaid')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isPaid && (
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 gap-1 bg-emerald-600 text-xs hover:bg-emerald-700"
                            disabled={markPaid.isPending}
                            onClick={() =>
                              markPaid.mutate(
                                { id: p.id, data: {} },
                                { onError: (err) => toast.error(getErrorMessage(err)) },
                              )
                            }
                          >
                            {markPaid.isPending && markPaid.variables?.id === p.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}{" "}
                            {tx('pay')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
