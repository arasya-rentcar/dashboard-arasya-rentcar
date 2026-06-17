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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardShell from '@/components/layout/DashboardShell';
import { useOrders } from '@/hooks/useOrders';
import { useFinalOrders } from '@/hooks/useFinalOrders';
import { useCars } from '@/hooks/useCars';
import { useDrivers } from '@/hooks/useDrivers';
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

  // ── Operational counts (from orders list) ──────────────────────────────
  const totalOrders = orders?.length ?? 0;
  const activeTrips =
    orders?.filter(
      (o) => o.order_status === 'IN_PROGRESS' || o.order_status === 'ASSIGNED',
    ).length ?? 0;

  // ── Financial KPIs (from final_finance — the source of truth) ───────────
  const rows = finalOrders ?? [];
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
    const driver = num(fin?.total_driver_amount);
    const ops = num(fin?.total_ops_cost);

    turnover += value;
    opsCost += ops;
    driverPayout += driver;

    if (o.payment_status === 'PAID') collected += value;
    else receivables += value;

    // debt = driver/vendor cost we haven't settled yet
    if (!fin?.driver_paid_date) payables += driver;
  }

  // Nett income = collected (clear) income, minus ops and external resource cost
  const nettIncome = collected - opsCost - driverPayout;

  // ── Operational tables ──────────────────────────────────────────────────
  const unpaidList = (orders ?? []).filter(
    (o) => o.payment_status === 'UNPAID' && o.order_status !== 'CANCELLED',
  );
  const availableCars = (cars ?? []).filter((c) => c.status === 'AVAILABLE');
  const availableDrivers = (drivers ?? []).filter(
    (d) => d.status === 'AVAILABLE',
  );

  // ── Rental frequency (from final_finance raw fields; no trips yet) ───────
  const carFreq: Record<string, number> = {};
  const driverFreq: Record<string, number> = {};
  for (const o of rows) {
    if (o.order_status === 'CANCELLED') continue;
    const car = (
      o.final_finance?.vehicle_raw ||
      o.final_finance?.plate_no_raw ||
      ''
    ).trim();
    if (car) carFreq[car] = (carFreq[car] ?? 0) + 1;
    const drv = (o.final_finance?.driver_vendor_raw || '').trim();
    if (drv) driverFreq[drv] = (driverFreq[drv] ?? 0) + 1;
  }
  const toItems = (m: Record<string, number>): FreqItem[] =>
    Object.entries(m).map(([label, count]) => ({ label, count }));
  const carItems = toItems(carFreq);
  const driverItems = toItems(driverFreq);

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
      value: formatCurrency(payables),
      hint: 'Unsettled driver / vendor cost',
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
          <h2 className="text-sm font-medium text-gray-500 mb-4">
            Financial Overview
          </h2>
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

        {/* ── Rental frequency charts ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FrequencyChart
            title="Most Rented Cars"
            subtitle="Times each car was used on an order"
            items={carItems}
            loading={finLoading}
            barClass="bg-blue-600"
          />
          <FrequencyChart
            title="Top Drivers / Vendors"
            subtitle="Orders handled per driver / vendor"
            items={driverItems}
            loading={finLoading}
            barClass="bg-emerald-600"
          />
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
                <span className="font-medium text-gray-900">
                  {o.customer_name}
                </span>
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
