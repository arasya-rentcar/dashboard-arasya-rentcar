"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, CalendarCheck, Wallet } from "lucide-react";
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
import { formatCurrency, formatDate } from "@/lib/utils";
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

const LINE_STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
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
    <div className={`rounded-xl border px-4 py-3 ${styles}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

export default function PartnerDetailView({
  kind,
  summary,
  trips,
  payments,
}: Props) {
  const [tab, setTab] = useState<"trips" | "payments">("trips");
  const markPaid = useMarkPayablePaid();
  const earned =
    kind === "DRIVER" ? summary.total_earned : summary.total_billed;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Trip" value={String(summary.total_trips)} accent="blue" />
        <StatCard
          label="Trip Selesai"
          value={String(summary.completed_trips)}
          accent="gray"
        />
        <StatCard
          label={kind === "DRIVER" ? "Total Fee" : "Total Tagihan"}
          value={formatCurrency(earned ?? 0)}
          accent="gray"
        />
        <StatCard
          label="Sudah Dibayar"
          value={formatCurrency(summary.total_paid)}
          accent="emerald"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(summary.outstanding)}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <StatCard
          label="Revenue dari Trip"
          value={formatCurrency(summary.revenue_generated)}
          accent="gray"
        />
        <StatCard
          label="Margin Dihasilkan"
          value={formatCurrency(summary.margin_generated)}
          accent="gray"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("trips")}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "trips"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <CalendarCheck className="h-4 w-4" /> Riwayat Trip ({trips.length})
        </button>
        <button
          onClick={() => setTab("payments")}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "payments"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Wallet className="h-4 w-4" /> Riwayat Pembayaran ({payments.length})
        </button>
      </div>

      {/* Trips tab */}
      {tab === "trips" && (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Trip</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-400">
                    Belum ada trip.
                  </TableCell>
                </TableRow>
              ) : (
                trips.map((t) => {
                  const car = t.car || t.external_car;
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
                      <TableCell className="text-sm text-gray-600">
                        {t.order?.customer_name || "-"}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm text-gray-600">
                        {route || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {car
                          ? `${car.model}${car.plate_number ? ` · ${car.plate_number}` : ""}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(t.total_price)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${LINE_STATUS_STYLES[t.line_status] ?? ""}`}
                        >
                          {t.line_status}
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
                <TableHead>Tanggal</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">Lainnya</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-400">
                    Belum ada tagihan.
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
                            LUNAS
                            {p.paid_at ? ` · ${formatDate(p.paid_at)}` : ""}
                          </Badge>
                        ) : (
                          <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                            BELUM
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isPaid && (
                          <Button
                            size="sm"
                            className="h-8 gap-1 bg-emerald-600 text-xs hover:bg-emerald-700"
                            disabled={markPaid.isPending}
                            onClick={() => markPaid.mutate({ id: p.id, data: {} })}
                          >
                            <Check className="h-3 w-3" /> Bayar
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
