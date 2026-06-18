"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { DashboardAnalytics, AgingBuckets } from "@/types";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  TrendingDown,
  User,
  Building2,
  Car,
} from "lucide-react";

function fmtPct(v: number) {
  return `${v.toFixed(1)}%`;
}

const AGING_LABELS: { key: keyof AgingBuckets; label: string; tone: string }[] =
  [
    { key: "current", label: "Belum jatuh tempo", tone: "text-gray-700" },
    { key: "d1_7", label: "1–7 hari", tone: "text-amber-600" },
    { key: "d8_14", label: "8–14 hari", tone: "text-orange-600" },
    { key: "d15_30", label: "15–30 hari", tone: "text-red-600" },
    { key: "d30plus", label: ">30 hari", tone: "text-red-800" },
  ];

function AgingTable({ title, data }: { title: string; data: AgingBuckets }) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  return (
    <Card className="shadow-none border border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {AGING_LABELS.map(({ key, label, tone }) => {
          const v = data[key];
          const pct = total > 0 ? (v / total) * 100 : 0;
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={tone}>{label}</span>
                <span className="font-medium">{formatCurrency(v)}</span>
              </div>
              <div className="h-1.5 w-full rounded bg-gray-100">
                <div
                  className="h-1.5 rounded bg-gray-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function TrendChart({ data }: { data: DashboardAnalytics["monthly_trend"] }) {
  const max = Math.max(
    1,
    ...data.flatMap((d) => [d.turnover, d.collected, d.payout]),
  );
  return (
    <Card className="shadow-none border border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          Tren 6 Bulan (Turnover · Collected · Payout)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2 pt-2" style={{ height: 160 }}>
          {data.map((m) => (
            <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-[130px] w-full items-end justify-center gap-0.5">
                <div
                  className="w-2 rounded-t bg-gray-800"
                  style={{ height: `${(m.turnover / max) * 100}%` }}
                  title={`Turnover ${formatCurrency(m.turnover)}`}
                />
                <div
                  className="w-2 rounded-t bg-emerald-500"
                  style={{ height: `${(m.collected / max) * 100}%` }}
                  title={`Collected ${formatCurrency(m.collected)}`}
                />
                <div
                  className="w-2 rounded-t bg-red-400"
                  style={{ height: `${(m.payout / max) * 100}%` }}
                  title={`Payout ${formatCurrency(m.payout)}`}
                />
              </div>
              <span className="text-[10px] text-gray-500">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-gray-800" /> Turnover
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Collected
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-red-400" /> Payout
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsSections({
  data,
  loading,
}: {
  data?: DashboardAnalytics;
  loading?: boolean;
}) {
  if (loading || !data) {
    return (
      <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
    );
  }

  const r = data.receivables;
  const cf = data.cashflow;
  const mix = data.mix;
  const totalMixRev = mix.internal.revenue + mix.external.revenue || 1;
  const totalMixTrips = mix.internal.trips + mix.external.trips || 1;

  return (
    <div className="space-y-6">
      {/* 1 + 4. Receivables split + cashflow */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-500">
          Receivables &amp; Cashflow
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border border-amber-100 bg-amber-50/40 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-900">
                Belum DP
              </CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold text-amber-700">
                {formatCurrency(r.dp_pending)}
              </p>
              <p className="mt-1 text-xs text-amber-900/60">Order tanpa pembayaran</p>
            </CardContent>
          </Card>
          <Card className="border border-blue-100 bg-blue-50/40 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">
                Pelunasan Tertunda
              </CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold text-blue-700">
                {formatCurrency(r.settlement_due)}
              </p>
              <p className="mt-1 text-xs text-blue-900/60">Sudah DP, sisa tagihan</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Piutang
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(r.total)}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Belum ditagih: {formatCurrency(r.unbilled)}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Cashflow 7 Hari
              </CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <p
                className={`text-xl font-semibold ${cf.net_7d >= 0 ? "text-emerald-600" : "text-red-600"}`}
              >
                {formatCurrency(cf.net_7d)}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Masuk {formatCurrency(cf.inflow_7d)} · Keluar{" "}
                {formatCurrency(cf.outflow_7d)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 2. Aging buckets */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-500">Aging (Umur Tagihan)</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AgingTable title="Piutang (Receivables)" data={data.aging.receivables} />
          <AgingTable title="Hutang (Payables)" data={data.aging.payables} />
        </div>
      </div>

      {/* 6. Internal vs external mix */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-500">
          Internal vs External
        </h2>
        <Card className="shadow-none border border-gray-200">
          <CardContent className="space-y-4 pt-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-blue-700">
                  <User className="h-3.5 w-3.5" /> Internal · {mix.internal.trips} trip
                </span>
                <span className="flex items-center gap-1 text-purple-700">
                  External · {mix.external.trips} trip <Building2 className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded">
                <div
                  className="bg-blue-500"
                  style={{ width: `${(mix.internal.trips / totalMixTrips) * 100}%` }}
                />
                <div
                  className="bg-purple-500"
                  style={{ width: `${(mix.external.trips / totalMixTrips) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-400">Distribusi jumlah trip</p>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-blue-700">
                  {formatCurrency(mix.internal.revenue)}
                </span>
                <span className="text-purple-700">
                  {formatCurrency(mix.external.revenue)}
                </span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded">
                <div
                  className="bg-blue-400"
                  style={{ width: `${(mix.internal.revenue / totalMixRev) * 100}%` }}
                />
                <div
                  className="bg-purple-400"
                  style={{ width: `${(mix.external.revenue / totalMixRev) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-400">Distribusi revenue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Margin per order */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-500">Margin per Order</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MarginTable
            title="Margin Tertinggi"
            icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
            rows={data.margin.top}
          />
          <MarginTable
            title="Margin Terendah"
            icon={<TrendingDown className="h-4 w-4 text-red-600" />}
            rows={data.margin.bottom}
          />
        </div>
      </div>

      {/* 5. Partner leaderboard */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-500">
          Leaderboard Driver &amp; Vendor
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LeaderTable
            title="Top Driver"
            href="/dashboard/drivers"
            rows={data.leaderboard.drivers.map((d) => ({
              id: d.id,
              name: d.name,
              trips: d.trips,
              revenue: d.revenue,
              extra: d.margin,
              extraLabel: "margin",
            }))}
          />
          <LeaderTable
            title="Top Vendor"
            href="/dashboard/external"
            rows={data.leaderboard.vendors.map((v) => ({
              id: v.id,
              name: v.name,
              trips: v.trips,
              revenue: v.revenue,
              extra: v.cost,
              extraLabel: "cost",
            }))}
          />
        </div>
      </div>

      {/* 7. Car utilization */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-500">
          Utilisasi Mobil (Internal)
        </h2>
        <Card className="shadow-none border border-gray-200">
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mobil</TableHead>
                    <TableHead>Plat</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Hari Terpakai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.car_utilization.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="flex items-center gap-2 text-sm">
                        <Car className="h-3.5 w-3.5 text-gray-400" />
                        {c.model}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {c.plate_number || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {c.days_booked}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 8. Monthly trend */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-500">Tren Bulanan</h2>
        <TrendChart data={data.monthly_trend} />
      </div>
    </div>
  );
}

function MarginTable({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  rows: DashboardAnalytics["margin"]["top"];
}) {
  return (
    <Card className="shadow-none border border-gray-200">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        {icon}
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">Belum ada data.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.order_id}>
                  <TableCell className="text-sm">
                    <Link
                      href={`/dashboard/orders/${m.order_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {m.order_code || m.customer_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrency(m.revenue)}
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm font-medium ${m.margin >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {formatCurrency(m.margin)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-gray-500">
                    {fmtPct(m.margin_pct)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function LeaderTable({
  title,
  href,
  rows,
}: {
  title: string;
  href: string;
  rows: {
    id: string;
    name: string;
    trips: number;
    revenue: number;
    extra: number;
    extraLabel: string;
  }[];
}) {
  return (
    <Card className="shadow-none border border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Link href={href} className="text-xs text-blue-600 hover:underline">
          Lihat semua →
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">Belum ada data.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="text-right">Trip</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right capitalize">
                  {rows[0]?.extraLabel}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm">{row.name}</TableCell>
                  <TableCell className="text-right text-sm">{row.trips}</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrency(row.revenue)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-500">
                    {formatCurrency(row.extra)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
