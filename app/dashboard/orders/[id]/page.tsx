"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, PencilLine, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import DashboardShell from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TripTimeline from "@/components/orders/TripTimeline";
import OrderFinanceCard from "@/components/orders/OrderFinanceCard";
import InvoiceSection from "@/components/orders/InvoiceSection";
import AssignDriverForm from "@/components/forms/AssignDriverForm";
import GenerateInvoiceForm from "@/components/forms/GenerateInvoiceForm";
import ReviseInvoiceForm from "@/components/forms/ReviseInvoiceForm";
import EditOrderForm from "@/components/forms/EditOrderForm";
import {
  useOrder,
  useAssignOrder,
  useUpdateOrder,
  useGenerateInvoice,
  useReviseInvoice,
} from "@/hooks/useOrders";
import { useAdvanceTripStatus } from "@/hooks/useTrips";
import { formatCurrency, formatDateTime, getErrorMessage } from "@/lib/utils";
import {
  GenerateInvoiceInput,
  Invoice,
  ReviseInvoiceInput,
  OrderStatus,
  TripStatus,
} from "@/types";

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  CREATED: "bg-gray-100 text-gray-700 border-gray-200",
  ASSIGNED: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  DONE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [assignOpen, setAssignOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [revisionInvoice, setRevisionInvoice] = useState<Invoice | null>(null);

  const { data: order, isLoading } = useOrder(id);
  const assignMutation = useAssignOrder();
  const updateOrderMutation = useUpdateOrder();
  const generateInvoiceMutation = useGenerateInvoice();
  const reviseInvoiceMutation = useReviseInvoice();
  const advanceTripMutation = useAdvanceTripStatus(id);

  const alreadyPaid =
    order?.invoices
      .filter((inv) => !["REVISED", "CANCELLED"].includes(inv.status))
      .reduce((sum, inv) => sum + Number(inv.amount), 0) ?? 0;
  const orderFinalPrice = Number(order?.final_price ?? 0);
  const invoiceDifference = orderFinalPrice - alreadyPaid;
  const serviceStart = order?.service_start_at;
  const serviceEnd = order?.service_end_at;
  const serviceDuration =
    serviceStart && serviceEnd
      ? formatDuration(serviceStart, serviceEnd)
      : "Not finished yet";

  async function handleAssign(data: { driver_id: string; car_id: string }) {
    try {
      await assignMutation.mutateAsync({ id, data });
      toast.success("Driver assigned successfully");
      setAssignOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleUpdateOrder(
    data: Parameters<typeof updateOrderMutation.mutateAsync>[0]["data"],
  ) {
    try {
      await updateOrderMutation.mutateAsync({ id, data });
      toast.success("Order updated successfully");
      setEditOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleGenerateInvoice(data: GenerateInvoiceInput) {
    try {
      await generateInvoiceMutation.mutateAsync({ id, data });
      toast.success("Invoice generated successfully");
      setInvoiceOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleReviseInvoice(data: ReviseInvoiceInput) {
    if (!revisionInvoice) return;
    try {
      await reviseInvoiceMutation.mutateAsync({
        id,
        invoiceId: revisionInvoice.id,
        data,
      });
      toast.success("Invoice revision created successfully");
      setRevisionInvoice(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleAdvanceTrip(nextStatus: TripStatus) {
    if (!order?.trip) return;
    try {
      await advanceTripMutation.mutateAsync({
        tripId: order.trip.id,
        nextStatus,
      });
      toast.success(`Trip advanced to: ${nextStatus.replace(/_/g, " ")}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <DashboardShell title="Order Detail">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-40 bg-white rounded-xl border border-gray-200 animate-pulse"
            />
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
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setEditOpen(true)}
              size="sm"
              variant="outline"
            >
              <PencilLine className="h-4 w-4 mr-2" />
              Edit Order
            </Button>
            {order.order_status === "CREATED" && (
              <Button onClick={() => setAssignOpen(true)} size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Driver
              </Button>
            )}
          </div>
        </div>

        {order.invoices.length > 0 && invoiceDifference !== 0 && (
          <div
            className={`rounded-lg border p-3 flex gap-3 text-sm ${invoiceDifference > 0 ? "bg-amber-50 border-amber-100 text-amber-800" : "bg-red-50 border-red-100 text-red-700"}`}
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">
                {invoiceDifference > 0
                  ? "Order price is higher than active invoice total"
                  : "Active invoice total exceeds order price"}
              </p>
              <p>
                Order total: {formatCurrency(orderFinalPrice)} | Active invoice
                total: {formatCurrency(alreadyPaid)} | Difference:{" "}
                {formatCurrency(invoiceDifference)}
              </p>
              <p className="text-xs mt-1">
                {invoiceDifference > 0
                  ? "Generate another invoice for the remaining amount, or revise the latest invoice if this is a correction."
                  : "Edit order price upward or revise/cancel invoices before creating more invoices."}
              </p>
            </div>
          </div>
        )}

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
                  <InfoRow label="Primary PIC" value={order.customer_name} />
                  <InfoRow
                    label="Primary Phone"
                    value={order.customer_phone || "-"}
                  />
                  <InfoRow label="Pickup" value={order.pickup_location} />
                  <InfoRow label="Dropoff" value={order.dropoff_location} />
                  <InfoRow
                    label="Order Date"
                    value={formatDateTime(order.order_date)}
                  />
                  <InfoRow
                    label="Pickup Time"
                    value={serviceStart ? formatDateTime(serviceStart) : "-"}
                  />
                  <InfoRow
                    label="Dropoff Time"
                    value={serviceEnd ? formatDateTime(serviceEnd) : "-"}
                  />
                  <InfoRow label="Service Duration" value={serviceDuration} />
                  <InfoRow
                    label="Final Price"
                    value={formatCurrency(order.final_price)}
                  />
                  <InfoRow
                    label="Created At"
                    value={formatDateTime(order.created_at)}
                  />
                </div>
                {order.customers && order.customers.length > 1 && (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">
                      All Customer / PIC
                    </p>
                    <div className="space-y-2">
                      {order.customers.map((customer, index) => (
                        <div
                          key={customer.id || index}
                          className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {customer.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {customer.phone || "-"}
                            </p>
                          </div>
                          {customer.is_primary && (
                            <Badge variant="outline" className="text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <OrderFinanceCard order={order} />

            <Card className="shadow-none border border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">
                  Service Details / Invoice Lines
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.service_items?.length ? (
                  <div className="space-y-3">
                    {order.service_items.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="rounded-lg border border-gray-100 bg-gray-50/70 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {item.service_kind
                                ? `${item.service_kind} — `
                                : ""}
                              {item.description ||
                                `Service Detail #${index + 1}`}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {item.service_date
                                ? formatDateTime(item.service_date).split(
                                    ",",
                                  )[0]
                                : "-"}
                              {item.start_at
                                ? ` • ${formatDateTime(item.start_at)}`
                                : ""}
                              {item.end_at
                                ? ` → ${formatDateTime(item.end_at)}`
                                : ""}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {item.pickup_location} → {item.dropoff_location}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-gray-400 mt-1">
                                {item.notes}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-gray-400">
                              Qty {item.quantity} ×{" "}
                              {formatCurrency(item.unit_price)}
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(item.total_price)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    No itemized service details yet.
                  </p>
                )}
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
                    <InfoRow label="Driver" value={order.trip.driver.name} />
                    <InfoRow
                      label="Driver Phone"
                      value={order.trip.driver.phone}
                    />
                    <InfoRow label="Car" value={order.trip.car.model} />
                    <InfoRow
                      label="Plate"
                      value={order.trip.car.plate_number}
                    />
                    {order.trip.started_at && (
                      <InfoRow
                        label="Started"
                        value={formatDateTime(order.trip.started_at)}
                      />
                    )}
                    {order.trip.finished_at && (
                      <InfoRow
                        label="Finished"
                        value={formatDateTime(order.trip.finished_at)}
                      />
                    )}
                  </div>

                  <Separator className="mb-6" />

                  <h4 className="text-sm font-medium text-gray-700 mb-4">
                    Trip Progress
                  </h4>
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
                  <CardTitle className="text-base">
                    Invoices & Payment
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      order.payment_status === "PAID"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : order.payment_status === "DP_PAID"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {order.payment_status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <InvoiceSection
                  invoices={order.invoices}
                  finalPrice={orderFinalPrice}
                  onOpenGenerate={() => setInvoiceOpen(true)}
                  onOpenRevise={setRevisionInvoice}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Order Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[96vw] max-w-[1280px] max-h-[96vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>
          <EditOrderForm
            order={order}
            activeInvoiceTotal={alreadyPaid}
            onSubmit={handleUpdateOrder}
            isLoading={updateOrderMutation.isPending}
          />
        </DialogContent>
      </Dialog>

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
            finalPrice={orderFinalPrice}
            alreadyPaid={alreadyPaid}
            onSubmit={handleGenerateInvoice}
            isLoading={generateInvoiceMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Revise Invoice Dialog */}
      <Dialog
        open={!!revisionInvoice}
        onOpenChange={(open) => !open && setRevisionInvoice(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Current Invoice</DialogTitle>
          </DialogHeader>
          {revisionInvoice && (
            <ReviseInvoiceForm
              invoice={revisionInvoice}
              onSubmit={handleReviseInvoice}
              isLoading={reviseInvoiceMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function formatDuration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "-";
  const totalMinutes = Math.round(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes || !parts.length) parts.push(`${minutes}m`);
  return parts.join(" ");
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
