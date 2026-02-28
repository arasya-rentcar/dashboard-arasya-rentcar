'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import DashboardShell from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import TripTimeline from '@/components/orders/TripTimeline';
import InvoiceSection from '@/components/orders/InvoiceSection';
import AssignDriverForm from '@/components/forms/AssignDriverForm';
import GenerateInvoiceForm from '@/components/forms/GenerateInvoiceForm';
import { useOrder, useAssignOrder, useGenerateInvoice } from '@/hooks/useOrders';
import { useAdvanceTripStatus } from '@/hooks/useTrips';
import { formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils';
import { GenerateInvoiceInput, OrderStatus, TripStatus } from '@/types';

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  CREATED:     'bg-gray-100 text-gray-700 border-gray-200',
  ASSIGNED:    'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  DONE:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED:   'bg-red-50 text-red-700 border-red-200',
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [assignOpen, setAssignOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const { data: order, isLoading } = useOrder(id);
  const assignMutation = useAssignOrder();
  const generateInvoiceMutation = useGenerateInvoice();
  const advanceTripMutation = useAdvanceTripStatus(id);

  const alreadyPaid = order?.invoices.reduce((sum, inv) => sum + Number(inv.amount), 0) ?? 0;

  async function handleAssign(data: { driver_id: string; car_id: string }) {
    try {
      await assignMutation.mutateAsync({ id, data });
      toast.success('Driver assigned successfully');
      setAssignOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleGenerateInvoice(data: GenerateInvoiceInput) {
    try {
      await generateInvoiceMutation.mutateAsync({ id, data });
      toast.success('Invoice generated successfully');
      setInvoiceOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleAdvanceTrip(nextStatus: TripStatus) {
    if (!order?.trip) return;
    try {
      await advanceTripMutation.mutateAsync({ tripId: order.trip.id, nextStatus });
      toast.success(`Trip advanced to: ${nextStatus.replace(/_/g, ' ')}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <DashboardShell title="Order Detail">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-white rounded-xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  if (!order) {
    return (
      <DashboardShell title="Order Detail">
        <div className="text-center py-16 text-gray-400">Order not found.</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Order Detail">
      <div className="space-y-6">
        {/* Back + Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/orders">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Orders
              </Link>
            </Button>
            <div className="h-4 w-px bg-gray-200" />
            <span className="font-mono text-xs text-gray-500">{order.id}</span>
          </div>
          {order.order_status === 'CREATED' && (
            <Button onClick={() => setAssignOpen(true)} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Driver
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — Order + Trip */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Information */}
            <Card className="shadow-none border border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Order Information</CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-xs ${ORDER_STATUS_STYLES[order.order_status]}`}
                  >
                    {order.order_status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <InfoRow label="Customer"   value={order.customer_name} />
                  <InfoRow label="Phone"      value={order.customer_phone} />
                  <InfoRow label="Pickup"     value={order.pickup_location} />
                  <InfoRow label="Dropoff"    value={order.dropoff_location} />
                  <InfoRow label="Order Date" value={formatDateTime(order.order_date)} />
                  <InfoRow label="Final Price" value={formatCurrency(order.final_price)} />
                  <InfoRow label="Created At" value={formatDateTime(order.created_at)} />
                </div>
              </CardContent>
            </Card>

            {/* Trip Information */}
            {order.trip && (
              <Card className="shadow-none border border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Trip Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                    <InfoRow label="Driver"       value={order.trip.driver.name} />
                    <InfoRow label="Driver Phone" value={order.trip.driver.phone} />
                    <InfoRow label="Car"          value={order.trip.car.model} />
                    <InfoRow label="Plate"        value={order.trip.car.plate_number} />
                    {order.trip.started_at && (
                      <InfoRow label="Started" value={formatDateTime(order.trip.started_at)} />
                    )}
                    {order.trip.finished_at && (
                      <InfoRow label="Finished" value={formatDateTime(order.trip.finished_at)} />
                    )}
                  </div>

                  <Separator className="mb-6" />

                  <h4 className="text-sm font-medium text-gray-700 mb-4">Trip Progress</h4>
                  <TripTimeline
                    currentStatus={order.trip.current_status}
                    logs={order.trip.logs}
                    tripId={order.trip.id}
                    onAdvance={handleAdvanceTrip}
                    isAdvancing={advanceTripMutation.isPending}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column — Invoice & Payment */}
          <div className="space-y-6">
            <Card className="shadow-none border border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Invoices & Payment</CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      order.payment_status === 'PAID'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : order.payment_status === 'DP_PAID'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {order.payment_status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <InvoiceSection
                  invoices={order.invoices}
                  finalPrice={Number(order.final_price)}
                  onOpenGenerate={() => setInvoiceOpen(true)}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Assign Driver Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Driver & Car</DialogTitle>
          </DialogHeader>
          <AssignDriverForm
            onSubmit={handleAssign}
            isLoading={assignMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Generate Invoice Dialog */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
          </DialogHeader>
          <GenerateInvoiceForm
            finalPrice={Number(order.final_price)}
            alreadyPaid={alreadyPaid}
            onSubmit={handleGenerateInvoice}
            isLoading={generateInvoiceMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
