'use client';

import { ShoppingBag, Truck, DollarSign, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardShell from '@/components/layout/DashboardShell';
import { useOrders } from '@/hooks/useOrders';
import { useDrivers } from '@/hooks/useDrivers';

export default function DashboardPage() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: drivers, isLoading: driversLoading } = useDrivers();

  const totalOrders = orders?.length ?? 0;
  const activeTrips =
    orders?.filter((o) => o.order_status === 'IN_PROGRESS' || o.order_status === 'ASSIGNED')
      .length ?? 0;
  const unpaidOrders =
    orders?.filter((o) => o.payment_status === 'UNPAID').length ?? 0;
  const availableDrivers =
    drivers?.filter((d) => d.status === 'AVAILABLE').length ?? 0;

  const stats = [
    {
      label: 'Total Orders',
      value: totalOrders,
      icon: ShoppingBag,
      loading: ordersLoading,
    },
    {
      label: 'Active Trips',
      value: activeTrips,
      icon: Truck,
      loading: ordersLoading,
    },
    {
      label: 'Unpaid Orders',
      value: unpaidOrders,
      icon: DollarSign,
      loading: ordersLoading,
    },
    {
      label: 'Available Drivers',
      value: availableDrivers,
      icon: Users,
      loading: driversLoading,
    },
  ];

  return (
    <DashboardShell title="Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-4">Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {stats.map(({ label, value, icon: Icon, loading }) => (
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
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
                  ) : (
                    <p className="text-3xl font-semibold text-gray-900">{value}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-4">Recent Orders</h2>
          <Card className="shadow-none border border-gray-200">
            <CardContent className="p-0">
              {ordersLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
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
                      <tr key={order.id} className="border-b border-gray-50 last:border-0">
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
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
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
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
