'use client';

import {
  ShoppingBag,
  Truck,
  Wallet,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  Banknote,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DashboardShell from '@/components/layout/DashboardShell';
import { useOrders } from '@/hooks/useOrders';
import { useFinalOrders } from '@/hooks/useFinalOrders';
import { useCars } from '@/hooks/useCars';
import { useDrivers } from '@/hooks/useDrivers';
import { usePayablesSummary } from '@/hooks/usePayables';
import { useDashboardAnalytics } from '@/hooks/useAnalytics';
import AnalyticsSections from '@/components/dashboard/AnalyticsSections';
import RevenueSummary from '@/components/revenue/RevenueSummary';
import { User, Building2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import PaginatedTable from '@/components/dashboard/PaginatedTable';
import FrequencyChart, { FreqItem } from '@/components/dashboard/FrequencyChart';

const num = (v?: string | null) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export default function DashboardPage() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: finalOrders, isLoading: finLoading } = useFinalOrders();
  const { data: cars, isLoading: carsLoading } = useCars();
  const { data: drivers, isLoading: driversLoading } = useDrivers();
  const { data: payablesSummary, isLoading: payablesLoading } = usePayablesSummary();
  const { data: analytics, isLoading: analyticsLoading } = useDashboardAnalytics();

  // ── Operational counts (from orders list) ──────────────────────────────
  const totalOrders = orders?.length ?? 0;
  const activeTrips =
    orders?.filter(
      (o) => o.order_status === 'IN_PROGRESS' || o.order_status === 'ASSIGNED',
    ).length ?? 0;

  // ── Date-range selector for KPIs ────────────────────────────────────────
  const [rangePreset, setRangePreset] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const range = useMemo(() => {
    const now = new Date();
    const startOf = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (rangePreset === 'THIS_MONTH') {
      return {
        f: new Date(now.getFullYear(), now.getMonth(), 1),
        t: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    }
    if (rangePreset === 'LAST_MONTH') {
      return {
        f: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        t: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      };
    }
    if (rangePreset === 'LAST_30') {
      const f = startOf(new Date(now));
      f.setDate(f.getDate() - 30);
      return { f, t: now };
    }
    if (rangePreset === 'YTD') {
      return { f: new Date(now.getFullYear(), 0, 1), t: now };
    }
    if (rangePreset === 'CUSTOM') {
      return {
        f: from ? new Date(`${from}T00:00:00`) : null,
        t: to ? new Date(`${to}T23:59:59`) : null,
      };
    }
    return { f: null as Date | null, t: null as Date | null };
  }, [rangePreset, from, to]);

  const inRange = (o: { final_finance?: { service_date?: string | null } | null; order_date: string }) => {
    if (!range.f && !range.t) return true;
    const refRaw = o.final_finance?.service_date || o.order_date;
    if (!refRaw) return false;
    const d = new Date(refRaw);
    if (range.f && d < range.f) return false;
    if (range.t && d > range.t) return false;
    return true;
  };

  // ── Financial KPIs (from final_finance — the source of truth) ───────────
  const rows = (finalOrders ?? []).filter(inRange);
  let turnover = 0; // all non-cancelled order value (paid + unpaid)
  let receivables = 0; // unpaid order value (money owed TO us)
  let collected = 0; // paid order value (money received)
  let opsCost = 0; // fuel/toll/parking etc.
  let driverPayout = 0; // driver / external vendor cost
  let payables = 0; // driver/vendor cost not yet paid (money WE owe)

  for (const o of rows) {
    if (o.order_status === 'CANCELLED') continue;
    const fin = o.final_finance;
    const value = num(fin?.total_user_amount) || num(o.final_price);
    const ops = num(fin?.total_ops_cost);
    const rtr = num(fin?.rtr_amount);
    // Resource cost = what we pay to run the trip: internal driver ops_cost
    // (also the DRIVER payable) + external vendor RTR. total_driver_amount is
    // an optional manual override and intentionally not added (avoids double
    // counting with ops_cost).
    const resourceCost = ops + rtr;

    turnover += value;
    opsCost += ops;
    driverPayout += resourceCost;

    if (o.payment_status === 'PAID') collected += value;
    else receivables += value;

    // debt = driver/vendor cost we haven't settled yet
    if (!fin?.driver_paid_date) payables += resourceCost;
  }

  // Nett income = collected (cleared) income minus resource cost
  // (driverPayout already includes ops + RTR, so don't subtract opsCost again).
  const nettIncome = collected - driverPayout;

  // ── Operational tables ──────────────────────────────────────────────────
  const unpaidList = (orders ?? []).filter(
    (o) => o.payment_status === 'UNPAID' && o.order_status !== 'CANCELLED',
  );
  const availableCars = (cars ?? []).filter((c) => c.status === 'AVAILABLE');
  const availableDrivers = (drivers ?? []).filter(
    (d) => d.status === 'AVAILABLE',
  );

  // ── Rental frequency (from analytics, split internal vs external) ────────
  const freq = analytics?.frequency;
  const toFreqItems = (rows?: { label: string; count: number }[]): FreqItem[] =>
    (rows ?? []).map((r) => ({ label: r.label, count: r.count }));
  const intCarItems = toFreqItems(freq?.internal.cars);
  const intDriverItems = toFreqItems(freq?.internal.drivers);
  const extCarItems = toFreqItems(freq?.external.cars);
  const extVendorItems = toFreqItems(freq?.external.vendors);

  const financial = [
    {
      label: 'Total Turnover',
      value: formatCurrency(turnover),
      hint: 'Paid + unpaid order value',
      icon: TrendingUp,
      tone: 'text-gray-900',
    },
    {
      label: 'Receivables',
      value: formatCurrency(receivables),
      hint: 'Unpaid orders — owed to us',
      icon: ArrowDownCircle,
      tone: 'text-amber-600',
    },
    {
      label: 'Debts (Payables)',
      value: formatCurrency(
        payablesSummary?.combined.outstanding ?? payables,
      ),
      hint: 'Unsettled driver + vendor (Tagihan)',
      icon: ArrowUpCircle,
      tone: 'text-red-600',
    },
    {
      label: 'Nett Income',
      value: formatCurrency(nettIncome),
      hint: 'Collected − ops − driver/vendor',
      icon: Wallet,
      tone: nettIncome >= 0 ? 'text-emerald-600' : 'text-red-600',
    },
  ];

  const secondary = [
    {
      label: 'Collected',
      value: formatCurrency(collected),
      icon: Banknote,
    },
    {
      label: 'Ops Cost',
      value: formatCurrency(opsCost),
      icon: Receipt,
    },
    {
      label: 'Driver / Vendor Payout',
      value: formatCurrency(driverPayout),
      icon: Truck,
    },
    {
      label: 'Total Orders',
      value: String(totalOrders),
      icon: ShoppingBag,
    },
  ];

  return (
    <DashboardShell title="Dashboard">
      <div className="space-y-6">
        {/* ── Financial overview ─────────────────────────────────────────── */}
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-sm font-medium text-gray-500">
              Financial Overview
              {rangePreset !== 'ALL' && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  (filtered)
                </span>
              )}
            </h2>
            <div className="flex flex-wrap items-end gap-2">
              <Select value={rangePreset} onValueChange={setRangePreset}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Time</SelectItem>
                  <SelectItem value="THIS_MONTH">This Month</SelectItem>
                  <SelectItem value="LAST_MONTH">Last Month</SelectItem>
                  <SelectItem value="LAST_30">Last 30 Days</SelectItem>
                  <SelectItem value="YTD">Year to Date</SelectItem>
                  <SelectItem value="CUSTOM">Custom…</SelectItem>
                </SelectContent>
              </Select>
              {rangePreset === 'CUSTOM' && (
                <>
                  <Input
                    type="date"
                    className="w-36"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                  <Input
                    type="date"
                    className="w-36"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </>
              )}
              {rangePreset !== 'ALL' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRangePreset('ALL');
                    setFrom('');
                    setTo('');
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {financial.map(({ label, value, hint, icon: Icon, tone }) => (
              <Card key={label} className="shadow-none border border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    {label}
                  </CardTitle>
                  <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  {finLoading ? (
                    <div className="h-8 w-28 bg-gray-100 rounded animate-pulse" />
                  ) : (
                    <>
                      <p className={`text-2xl font-semibold ${tone}`}>{value}</p>
                      <p className="mt-1 text-xs text-gray-400">{hint}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Revenue summary (embedded; full report at /dashboard/revenue) ── */}
        <RevenueSummary />

        {/* ── Secondary metrics ──────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-4">
            Breakdown
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {secondary.map(({ label, value, icon: Icon }) => (
              <Card key={label} className="shadow-none border border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    {label}
                  </CardTitle>
                  <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  {finLoading || ordersLoading ? (
                    <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
                  ) : (
                    <p className="text-2xl font-semibold text-gray-900">
                      {value}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Debts / Tagihan (internal vs external) ─────────────────────── */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500">
              Debts &middot; Hutang ke Driver &amp; Vendor
            </h2>
            <Link
              href="/dashboard/payables"
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Buka Tagihan &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Internal driver debt */}
            <Card className="shadow-none border border-blue-100 bg-blue-50/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">
                  Hutang Internal (Driver)
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-700" />
                </div>
              </CardHeader>
              <CardContent>
                {payablesLoading ? (
                  <div className="h-8 w-28 bg-blue-100 rounded animate-pulse" />
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-blue-700">
                      {formatCurrency(payablesSummary?.driver.outstanding ?? 0)}
                    </p>
                    <p className="mt-1 text-xs text-blue-900/60">
                      {payablesSummary?.driver.unpaid_count ?? 0} tagihan belum dibayar &middot; sudah dibayar{' '}
                      {formatCurrency(payablesSummary?.driver.paid ?? 0)}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* External vendor debt */}
            <Card className="shadow-none border border-purple-100 bg-purple-50/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-purple-900">
                  Hutang External (Vendor)
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-purple-700" />
                </div>
              </CardHeader>
              <CardContent>
                {payablesLoading ? (
                  <div className="h-8 w-28 bg-purple-100 rounded animate-pulse" />
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-purple-700">
                      {formatCurrency(payablesSummary?.vendor.outstanding ?? 0)}
                    </p>
                    <p className="mt-1 text-xs text-purple-900/60">
                      {payablesSummary?.vendor.unpaid_count ?? 0} tagihan belum dibayar &middot; sudah dibayar{' '}
                      {formatCurrency(payablesSummary?.vendor.paid ?? 0)}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Combined */}
            <Card className="shadow-none border border-red-100 bg-red-50/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-red-900">
                  Total Hutang Outstanding
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <ArrowUpCircle className="h-4 w-4 text-red-700" />
                </div>
              </CardHeader>
              <CardContent>
                {payablesLoading ? (
                  <div className="h-8 w-28 bg-red-100 rounded animate-pulse" />
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-red-700">
                      {formatCurrency(payablesSummary?.combined.outstanding ?? 0)}
                    </p>
                    <p className="mt-1 text-xs text-red-900/60">
                      Internal + External &middot; total lifetime{' '}
                      {formatCurrency(payablesSummary?.combined.total ?? 0)}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Rich analytics (receivables, aging, margin, cashflow, leaderboard,
            mix, car utilization, monthly trend) ───────────────────────── */}
        <AnalyticsSections data={analytics} loading={analyticsLoading} />

        {/* ── Rental frequency — Internal fleet ──────────────────────────── */}
        <div>
          <h2 className="mb-3 text-sm font-medium text-gray-500">
            Internal Fleet Frequency
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FrequencyChart
              title="Top Internal Cars"
              subtitle="Service lines per internal car"
              items={intCarItems}
              loading={analyticsLoading}
              barClass="bg-blue-600"
            />
            <FrequencyChart
              title="Top Internal Drivers"
              subtitle="Service lines per internal driver"
              items={intDriverItems}
              loading={analyticsLoading}
              barClass="bg-emerald-600"
            />
          </div>
        </div>

        {/* ── Rental frequency — External partners ───────────────────────── */}
        <div>
          <h2 className="mb-3 text-sm font-medium text-gray-500">
            External Partner Frequency
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FrequencyChart
              title="Top External Cars"
              subtitle="Service lines per partner car"
              items={extCarItems}
              loading={analyticsLoading}
              barClass="bg-indigo-600"
            />
            <FrequencyChart
              title="Top External Vendors"
              subtitle="Service lines per partner vendor"
              items={extVendorItems}
              loading={analyticsLoading}
              barClass="bg-amber-600"
            />
          </div>
        </div>

        {/* ── Unpaid orders ──────────────────────────────────────────────── */}
        <PaginatedTable
          title="Unpaid Orders"
          rows={unpaidList}
          loading={ordersLoading}
          emptyText="No unpaid orders."
          rowKey={(o) => o.id}
          columns={[
            {
              header: 'Customer',
              cell: (o) => (
                <Link
                  href={`/dashboard/orders/${o.id}`}
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {o.customer_name}
                </Link>
              ),
            },
            {
              header: 'Amount',
              cell: (o) => formatCurrency(Number(o.final_price || 0)),
            },
            {
              header: 'Status',
              cell: (o) => <StatusBadge status={o.order_status} />,
            },
            {
              header: 'Payment',
              cell: (o) => <PaymentBadge status={o.payment_status} />,
            },
          ]}
        />

        {/* ── Available cars + drivers ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PaginatedTable
            title="Available Cars"
            rows={availableCars}
            loading={carsLoading}
            emptyText="No available cars."
            rowKey={(c) => c.id}
            columns={[
              {
                header: 'Model',
                cell: (c) => (
                  <span className="font-medium text-gray-900">{c.model}</span>
                ),
              },
              { header: 'Plate', cell: (c) => c.plate_number },
              {
                header: 'Type',
                cell: (c) => (
                  <FleetBadge type={c.type} />
                ),
              },
            ]}
          />
          <PaginatedTable
            title="Available Drivers"
            rows={availableDrivers}
            loading={driversLoading}
            emptyText="No available drivers."
            rowKey={(d) => d.id}
            columns={[
              {
                header: 'Name',
                cell: (d) => (
                  <span className="font-medium text-gray-900">{d.name}</span>
                ),
              },
              { header: 'Phone', cell: (d) => d.phone },
              {
                header: 'Type',
                cell: (d) => <FleetBadge type={d.type} />,
              },
            ]}
          />
        </div>
      </div>
    </DashboardShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    CREATED: 'bg-gray-100 text-gray-700',
    ASSIGNED: 'bg-blue-50 text-blue-700',
    IN_PROGRESS: 'bg-amber-50 text-amber-700',
    DONE: 'bg-emerald-50 text-emerald-700',
    CANCELLED: 'bg-red-50 text-red-700',
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </span>
  );
}

function FleetBadge({ type }: { type: string }) {
  const isInternal = type === 'INTERNAL';
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
        isInternal
          ? 'bg-indigo-50 text-indigo-700'
          : 'bg-orange-50 text-orange-700'
      }`}
    >
      {type}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    UNPAID: 'bg-red-50 text-red-700',
    DP_PAID: 'bg-amber-50 text-amber-700',
    PAID: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
