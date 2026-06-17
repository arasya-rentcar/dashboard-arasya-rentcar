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
import { formatCurrency } from '@/lib/utils';

const num = (v?: string | null) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export default function DashboardPage() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: finalOrders, isLoading: finLoading } = useFinalOrders();

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

        {/* ── Recent Orders ──────────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-4">
            Recent Orders
          </h2>
          <Card className="shadow-none border border-gray-200">
            <CardContent className="p-0">
              {ordersLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-10 bg-gray-100 rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : orders && orders.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Customer
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Payment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-gray-50 last:border-0"
                      >
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {order.customer_name}
                        </td>
                        <td className="px-6 py-3">
                          <StatusBadge status={order.order_status} />
                        </td>
                        <td className="px-6 py-3">
                          <PaymentBadge status={order.payment_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-6 py-10 text-center text-sm text-gray-400">
                  No orders yet.
                </div>
              )}
            </CardContent>
          </Card>
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
