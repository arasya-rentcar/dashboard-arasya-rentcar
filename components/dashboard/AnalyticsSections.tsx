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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  TrendingDown,
  Car,
} from "lucide-react";

function fmtPct(v: number) {
  return `${v.toFixed(1)}%`;
}

function compactRp(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
  return String(v);
}

const tooltipContentStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #e5e7eb",
};
const rpFormatter = (val: unknown) => formatCurrency(Number(val ?? 0));

const AGING_LABELS: { key: keyof AgingBuckets; label: string; tone: string }[] =
  [
    { key: "current", label: "Belum jatuh tempo", tone: "text-gray-700" },
    { key: "d1_7", label: "1–7 hari", tone: "text-amber-600" },
    { key: "d8_14", label: "8–14 hari", tone: "text-orange-600" },
    { key: "d15_30", label: "15–30 hari", tone: "text-red-600" },
    { key: "d30plus", label: ">30 hari", tone: "text-red-800" },
  ];

const AGING_COLORS = ["#9ca3af", "#f59e0b", "#ea580c", "#dc2626", "#991b1b"];

function AgingTable({
  title,
  data,
  barColor,
}: {
  title: string;
  data: AgingBuckets;
  barColor: string;
}) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  const chartData = AGING_LABELS.map((a) => ({
    name: a.label,
    value: data[a.key],
  }));
  return (
    <Card className="shadow-none border border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-600">
          <span>{title}</span>
          <span className="text-xs text-gray-400">{formatCurrency(total)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={compactRp} fontSize={11} />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              fontSize={11}
              tickLine={false}
            />
            <Tooltip contentStyle={tooltipContentStyle} formatter={rpFormatter} />
            <Bar dataKey="value" fill={barColor} radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={AGING_COLORS[i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function TrendChart({ data }: { data: DashboardAnalytics["monthly_trend"] }) {
  return (
    <Card className="shadow-none border border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          Tren 6 Bulan (Turnover · Collected · Payout)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" fontSize={11} tickLine={false} />
            <YAxis tickFormatter={compactRp} fontSize={11} width={48} />
            <Tooltip contentStyle={tooltipContentStyle} formatter={rpFormatter} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="turnover" name="Turnover" fill="#1f2937" radius={[3, 3, 0, 0]} />
            <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[3, 3, 0, 0]} />
            <Bar dataKey="payout" name="Payout" fill="#f87171" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function MixDonut({
  title,
  internal,
  external,
  fmt,
}: {
  title: string;
  internal: number;
  external: number;
  fmt: (v: number) => string;
}) {
  const pieData = [
    { name: "Internal", value: internal },
    { name: "External", value: external },
  ];
  const total = internal + external;
  return (
    <div className="flex flex-col items-center">
      <p className="mb-1 text-xs font-medium text-gray-500">{title}</p>
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={2}
          >
            <Cell fill="#3b82f6" />
            <Cell fill="#a855f7" />
          </Pie>
          <Tooltip formatter={(v: unknown) => fmt(Number(v ?? 0))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex gap-4 text-[11px]">
        <span className="flex items-center gap-1 text-blue-600">
          <span className="h-2 w-2 rounded-sm bg-blue-500" /> Internal{" "}
          {total > 0 ? `${((internal / total) * 100).toFixed(0)}%` : "0%"}
        </span>
        <span className="flex items-center gap-1 text-purple-600">
          <span className="h-2 w-2 rounded-sm bg-purple-500" /> External{" "}
          {total > 0 ? `${((external / total) * 100).toFixed(0)}%` : "0%"}
        </span>
      </div>
    </div>
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
  const totalTrips = mix.internal.trips + mix.external.trips;

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
          <AgingTable
            title="Piutang (Receivables)"
            data={data.aging.receivables}
            barColor="#3b82f6"
          />
          <AgingTable
            title="Hutang (Payables)"
            data={data.aging.payables}
            barColor="#ef4444"
          />
        </div>
      </div>

      {/* 6. Internal vs external mix */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-500">
          Internal vs External
        </h2>
        <Card className="shadow-none border border-gray-200">
          <CardContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
            <MixDonut
              title={`Jumlah Trip (${totalTrips})`}
              internal={mix.internal.trips}
              external={mix.external.trips}
              fmt={(v) => `${v} trip`}
            />
            <MixDonut
              title="Revenue"
              internal={mix.internal.revenue}
              external={mix.external.revenue}
              fmt={formatCurrency}
            />
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
