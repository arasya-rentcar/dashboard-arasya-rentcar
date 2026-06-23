"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  UserPlus,
  UserCog,
  PencilLine,
  AlertTriangle,
  Plus,
  Loader2,
  RotateCcw,
  PlayCircle,
  CheckCircle2,
  Clock,
  Ban,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import DashboardShell from "@/components/layout/DashboardShell";
import QueryError from "@/components/dashboard/QueryError";
import MarkPaidDialog from "@/components/invoices/MarkPaidDialog";
import RefundDialog, {
  type RefundPayload,
} from "@/components/orders/RefundDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import OrderFinanceCard from "@/components/orders/OrderFinanceCard";
import InvoiceSection from "@/components/orders/InvoiceSection";
import AssignDriverForm from "@/components/forms/AssignDriverForm";
import GenerateInvoiceForm from "@/components/forms/GenerateInvoiceForm";
import AdditionalInvoiceForm from "@/components/forms/AdditionalInvoiceForm";
import CombinedInvoiceForm from "@/components/forms/CombinedInvoiceForm";
import ScheduleLineDialog from "@/components/schedule/ScheduleLineDialog";
import type { ScheduleLine, ScheduleStatus, OrderServiceItem } from "@/types";
import ReviseInvoiceForm from "@/components/forms/ReviseInvoiceForm";
import EditOrderForm from "@/components/forms/EditOrderForm";
import {
  useOrder,
  useAssignOrder,
  useReassignOrder,
  useUpdateOrder,
  useGenerateInvoice,
  useReviseInvoice,
  useAddAdjustment,
  useSendInvoiceWhatsapp,
  useSendReceiptWhatsapp,
  useMarkInvoicePaid,
  useMarkRefunded,
  useCancelOrder,
  useFinalizeOrder,
  type CancelOrderResult,
} from "@/hooks/useOrders";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getErrorMessage,
} from "@/lib/utils";
import {
  GenerateInvoiceInput,
  Invoice,
  ReviseInvoiceInput,
  OrderStatus,
} from "@/types";
import { ORDER_STATUS_STYLES, PAYMENT_STATUS_STYLES } from "@/lib/statusStyles";

const ORDER_STATUS_KEYS: Record<OrderStatus, string> = {
  CREATED: "statusCreated",
  ASSIGNED: "statusAssigned",
  IN_PROGRESS: "statusInProgress",
  DONE: "statusDone",
  CANCELLED: "statusCancelled",
};

const PAYMENT_STATUS_KEYS: Record<string, string> = {
  UNPAID: "payUnpaid",
  DP_PAID: "payDpPaid",
  PAID: "payPaid",
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("orderDetail");
  const tt = useTranslations("terms");
  const tc = useTranslations("common");
  const [assignOpen, setAssignOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [revisionInvoice, setRevisionInvoice] = useState<Invoice | null>(null);
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [additionalInvoiceOpen, setAdditionalInvoiceOpen] = useState(false);
  const [combinedInvoiceOpen, setCombinedInvoiceOpen] = useState(false);
  const [assignLine, setAssignLine] = useState<ScheduleLine | null>(null);
  const [markPaidInvoice, setMarkPaidInvoice] = useState<Invoice | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelResult, setCancelResult] = useState<CancelOrderResult | null>(
    null,
  );
  const [adjType, setAdjType] = useState("OVERTIME");
  const [adjDesc, setAdjDesc] = useState("");
  const [adjAmount, setAdjAmount] = useState("");

  const { data: order, isLoading, isError, refetch } = useOrder(id);
  const assignMutation = useAssignOrder();
  const reassignMutation = useReassignOrder();
  const cancelMutation = useCancelOrder();
  const finalizeMutation = useFinalizeOrder();
  const updateOrderMutation = useUpdateOrder();
  const generateInvoiceMutation = useGenerateInvoice();
  const reviseInvoiceMutation = useReviseInvoice();
  const addAdjustmentMutation = useAddAdjustment(id);
  const sendInvoiceMutation = useSendInvoiceWhatsapp();
  const sendReceiptMutation = useSendReceiptWhatsapp();
  const markInvoicePaidMutation = useMarkInvoicePaid();
  const markRefundedMutation = useMarkRefunded();

  async function handleSendInvoice(invoice: Invoice) {
    const phone =
      order?.customers?.find((c) => c.phone)?.phone ||
      order?.customer_phone ||
      "";
    const name =
      order?.customers?.find((c) => c.phone)?.name ||
      order?.customer_name ||
      "";
    if (!phone) {
      toast.error(t("okNoPhone"));
      return;
    }
    try {
      await sendInvoiceMutation.mutateAsync({
        id,
        invoiceId: invoice.id,
        data: { target_phone: phone, target_name: name },
      });
      toast.success(t("okInvoiceSent", { number: invoice.invoice_number }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleSendReceipt(invoice: Invoice) {
    const phone =
      order?.customers?.find((c) => c.phone)?.phone ||
      order?.customer_phone ||
      "";
    const name =
      order?.customers?.find((c) => c.phone)?.name ||
      order?.customer_name ||
      "";
    if (!phone) {
      toast.error(t("okNoPhone"));
      return;
    }
    try {
      await sendReceiptMutation.mutateAsync({
        id,
        invoiceId: invoice.id,
        data: { target_phone: phone, target_name: name },
      });
      toast.success(t("okReceiptSent", { number: invoice.invoice_number }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  // Sprint 3: paying requires a proof file, so open a dialog instead of paying
  // directly (also prevents accidental "mark paid" clicks).
  function handleMarkInvoicePaid(invoice: Invoice) {
    setMarkPaidInvoice(invoice);
  }

  async function confirmMarkInvoicePaid(payload: {
    proof: File;
    payment_method?: string;
    paid_at?: string;
    amount_received?: number;
  }) {
    if (!markPaidInvoice) return;
    try {
      await markInvoicePaidMutation.mutateAsync({
        id,
        invoiceId: markPaidInvoice.id,
        data: payload,
      });
      toast.success(
        t("okMarkedPaid", { number: markPaidInvoice.invoice_number }),
      );
      setMarkPaidInvoice(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const ADDITIONAL_TYPES: { label: string; value: string }[] = [
    { label: t("typeOvertime"), value: "OVERTIME" },
    { label: t("typeParking"), value: "PARKING" },
    { label: t("typeToll"), value: "TOLL" },
    { label: t("typeAdditional"), value: "OTHER" },
  ];

  async function handleAddAdditional() {
    const amt = Number(adjAmount || 0);
    if (!amt || amt <= 0) {
      toast.error(t("okEnterAmount"));
      return;
    }
    try {
      await addAdjustmentMutation.mutateAsync({
        type: adjType,
        description:
          adjDesc.trim() ||
          ADDITIONAL_TYPES.find((at) => at.value === adjType)?.label ||
          t("typeAdditional"),
        amount: amt,
        quantity: 1,
        is_billable: true,
      });
      toast.success(t("okAdditionalAdded"));
      setAdditionalOpen(false);
      setAdjType("OVERTIME");
      setAdjDesc("");
      setAdjAmount("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const alreadyPaid =
    order?.invoices
      .filter((inv) => !["REVISED", "CANCELLED"].includes(inv.status))
      .reduce((sum, inv) => sum + Number(inv.amount), 0) ?? 0;
  const orderFinalPrice = Number(order?.final_price ?? 0);
  const invoiceDifference = orderFinalPrice - alreadyPaid;
  // Sprint 5: refund owed = actual money received (paid_to_date) beyond the
  // order total. paid_to_date is the source of truth for cash received.
  const paidToDate = Number(order?.paid_to_date ?? 0);
  const refundDue = Math.max(paidToDate - orderFinalPrice, 0);
  const isRefunded = Boolean(order?.is_refunded);
  // Terminal orders are read-only for STRUCTURAL data (fields, service lines,
  // driver assignment, price adjustments). Billing/closure (invoices, payment,
  // receipt, refund) stays available because it happens after DONE / on a
  // cancelled order. Mirrors the API guard (assertOrderStructurallyEditable).
  const isStructurallyLocked =
    order?.order_status === "DONE" || order?.order_status === "CANCELLED";
  // Rental base = sum of service lines (excludes billable additionals, which the
  // combined invoice adds back explicitly).
  const rentalBase = (order?.service_items ?? []).reduce(
    (sum, item) => sum + Number(item.total_price || 0),
    0,
  );
  // Merge: the line IS the trip. "Assign for All" applies one driver/car to
  // every still-unassigned internal line; show it only when such a line exists.
  const hasUnassignedInternalLine = (order?.service_items ?? []).some(
    (item) =>
      !item.is_external &&
      item.line_status !== "CANCELLED" &&
      !item.driver?.id,
  );
  // "Reassign All" swaps the driver/car on every internal line that is assigned
  // but NOT yet started (line_status === ASSIGNED). Show it only when at least
  // one such line exists, so you can change drivers without editing day-by-day.
  const hasReassignableLine = (order?.service_items ?? []).some(
    (item) =>
      !item.is_external &&
      item.line_status === "ASSIGNED" &&
      !!item.driver?.id,
  );
  // A line counts as started once it is IN_PROGRESS or DONE.
  const anyLineStarted = (order?.service_items ?? []).some(
    (item) =>
      item.line_status === "IN_PROGRESS" || item.line_status === "DONE",
  );
  const serviceStart = order?.service_start_at;
  const serviceEnd = order?.service_end_at;
  // Rule B: rental must be fully paid by day 1 of service. Warn if service has
  // started (or starts today/earlier) while the order is not fully PAID.
  const serviceStarted =
    anyLineStarted ||
    (!!serviceStart && new Date(serviceStart).getTime() <= Date.now());
  const unpaidAtServiceStart =
    !!order && serviceStarted && order.payment_status !== "PAID";
  const serviceDuration =
    serviceStart && serviceEnd
      ? formatDuration(serviceStart, serviceEnd)
      : t("notFinishedYet");

  const serviceSummary = (() => {
    const items = order?.service_items ?? [];
    if (!items.length) return null;
    const dayKey = (d?: string | null) =>
      d ? new Date(d).toISOString().slice(0, 10) : "no-date";

    const groupMap = new Map<
      string,
      { key: string; date: string | null; lines: typeof items }
    >();
    for (const it of items) {
      const key = dayKey(it.service_date);
      if (!groupMap.has(key)) {
        groupMap.set(key, { key, date: it.service_date ?? null, lines: [] });
      }
      groupMap.get(key)!.lines.push(it);
    }
    const groups = Array.from(groupMap.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((g) => ({
        key: g.key,
        date: g.date,
        dateLabel: g.date ? formatDate(g.date) : t("noDate"),
        lines: g.lines,
      }));

    const dates = items
      .map((it) => it.service_date)
      .filter((d): d is string => !!d)
      .map((d) => new Date(d).toISOString().slice(0, 10))
      .sort();
    const total = items.reduce(
      (sum, it) => sum + Number(it.total_price || 0),
      0,
    );
    const first = dates[0];
    const last = dates[dates.length - 1];
    const rangeLabel =
      first && last
        ? first === last
          ? formatDate(first)
          : `${formatDate(first)} → ${formatDate(last)}`
        : "";
    return {
      dayCount: groups.filter((g) => g.date).length || groups.length,
      lineCount: items.length,
      total,
      rangeLabel,
      groups,
    };
  })();

  // Per-day operational progress: "Day N of M". Status-first (uses line_status,
  // the same signal driving the LIVE-day highlight) with a calendar tiebreak so
  // a driver forgetting to hit START never makes it lie. Returns the 1-based
  // index of the active day, or a terminal state.
  const dayProgress = (() => {
    const groups = serviceSummary?.groups ?? [];
    const totalDays = serviceSummary?.dayCount ?? 0;
    if (!groups.length || !totalDays) return null;

    // Classify each day-group by its lines' statuses.
    const dayState = groups.map((g) => {
      const active = g.lines.filter((l) => l.line_status !== "CANCELLED");
      const live = active.some((l) => l.line_status === "IN_PROGRESS");
      const allDone = active.length > 0 && active.every((l) => l.line_status === "DONE");
      const anyStarted = active.some(
        (l) => l.line_status === "IN_PROGRESS" || l.line_status === "DONE",
      );
      return { date: g.date, live, allDone, anyStarted };
    });

    // 1) A day is live right now.
    const liveIdx = dayState.findIndex((d) => d.live);
    if (liveIdx >= 0) {
      return { state: "active" as const, current: liveIdx + 1, total: totalDays };
    }

    const doneCount = dayState.filter((d) => d.allDone).length;
    const anyStarted = dayState.some((d) => d.anyStarted);

    // 2) All days finished.
    if (doneCount >= totalDays) {
      return { state: "completed" as const, current: totalDays, total: totalDays };
    }

    // 3) Between legs (some done, none live) -> next up.
    if (anyStarted) {
      return {
        state: "active" as const,
        current: Math.min(doneCount + 1, totalDays),
        total: totalDays,
      };
    }

    // 4) Nothing started by status. Calendar tiebreak: if today is on/after a
    //    scheduled day, surface the calendar day so a forgotten START isn't a lie.
    const todayKey = new Date().toISOString().slice(0, 10);
    const datedKeys = groups
      .map((g) => (g.date ? new Date(g.date).toISOString().slice(0, 10) : null))
      .filter((k): k is string => !!k)
      .sort();
    const elapsed = datedKeys.filter((k) => k <= todayKey).length;
    if (elapsed > 0) {
      return {
        state: "active" as const,
        current: Math.min(elapsed, totalDays),
        total: totalDays,
      };
    }

    // 5) Truly not started yet.
    return { state: "notStarted" as const, current: 0, total: totalDays };
  })();

  async function handleAssign(data: { driver_id: string; car_id: string }) {
    try {
      await assignMutation.mutateAsync({ id, data });
      toast.success(t("okDriverAssigned"));
      setAssignOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleReassign(data: { driver_id: string; car_id: string }) {
    try {
      await reassignMutation.mutateAsync({ id, data });
      toast.success(t("okDriverReassigned"));
      setReassignOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleCancelOrder() {
    if (!cancelReason.trim()) {
      toast.error(t("cancelReasonRequired"));
      return;
    }
    try {
      const result = await cancelMutation.mutateAsync({
        id,
        reason: cancelReason.trim(),
      });
      setCancelResult(result);
      setCancelReason("");
      toast.success(t("okOrderCancelled"));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleFinalizeOrder() {
    try {
      await finalizeMutation.mutateAsync({ id });
      setFinalizeOpen(false);
      toast.success(t("okOrderFinalized"));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  // Adapt an order service line into the ScheduleLine shape the per-day
  // assignment dialog expects (same underlying record / API route).
  function openDayAssign(item: OrderServiceItem) {
    if (!order || !item.id) return;
    setAssignLine({
      id: item.id,
      service_date: item.service_date ?? null,
      start_at: item.start_at ?? null,
      end_at: item.end_at ?? null,
      description: item.description ?? null,
      service_kind: item.service_kind ?? null,
      pickup_location: item.pickup_location,
      dropoff_location: item.dropoff_location,
      total_price: item.total_price,
      ops_cost: item.ops_cost ?? 0,
      rtr_amount: item.rtr_amount ?? null,
      margin_amount: item.margin_amount ?? null,
      is_external: item.is_external ?? false,
      line_status: (item.line_status as ScheduleStatus) ?? "SCHEDULED",
      driver_name_raw: item.driver_name_raw ?? null,
      plate_raw: item.plate_raw ?? null,
      notes: item.notes ?? null,
      order: {
        id: order.id,
        order_code:
          (order as { order_code?: string | null }).order_code ?? null,
        customer_name: order.customer_name,
        order_status: order.order_status,
        payment_status: order.payment_status,
      },
      driver: item.driver ?? null,
      car: item.car
        ? {
            id: item.car.id,
            model: item.car.model ?? "",
            plate_number: item.car.plate_number ?? null,
          }
        : null,
      external_vendor: item.external_vendor ?? null,
      external_car: item.external_car
        ? {
            id: item.external_car.id,
            model: item.external_car.model ?? "",
            plate_number: item.external_car.plate_number ?? null,
          }
        : null,
    });
  }

  async function handleUpdateOrder(
    data: Parameters<typeof updateOrderMutation.mutateAsync>[0]["data"],
  ) {
    try {
      await updateOrderMutation.mutateAsync({ id, data });
      toast.success(t("okOrderUpdated"));
      setEditOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleGenerateInvoice(data: GenerateInvoiceInput) {
    try {
      await generateInvoiceMutation.mutateAsync({ id, data });
      toast.success(t("okInvoiceGenerated"));
      setInvoiceOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleMarkRefunded(payload: RefundPayload) {
    try {
      await markRefundedMutation.mutateAsync({ id, data: payload });
      toast.success(t("okRefundMarked"));
      setRefundOpen(false);
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
      toast.success(t("okRevisionCreated"));
      setRevisionInvoice(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (isError) {
    return (
      <DashboardShell title={t('title')}>
        <QueryError onRetry={() => refetch()} />
      </DashboardShell>
    );
  }

  if (isLoading) {
    return (
      <DashboardShell title={t('title')}>
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
      <DashboardShell title={t('title')}>
        <div className="text-center py-16 text-gray-400">{t('notFound')}</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={t('title')}>
      <div className="space-y-6">
        {/* Back + Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/orders">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t('orders')}
              </Link>
            </Button>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-gray-900">
                {(order as { order_code?: string | null }).order_code ||
                  order.id.slice(0, 8)}
              </span>
              <Badge
                variant="outline"
                className={`text-xs ${ORDER_STATUS_STYLES[order.order_status]}`}
              >
                {t(ORDER_STATUS_KEYS[order.order_status])}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs ${PAYMENT_STATUS_STYLES[order.payment_status] ?? ""}`}
              >
                {PAYMENT_STATUS_KEYS[order.payment_status]
                  ? t(PAYMENT_STATUS_KEYS[order.payment_status])
                  : order.payment_status.replace("_", " ")}
              </Badge>
              {refundDue > 0 && !isRefunded && (
                <Badge
                  variant="outline"
                  className="text-xs bg-red-50 text-red-700 border-red-200"
                >
                  {t('refundDue')}
                </Badge>
              )}
              {isRefunded && (
                <Badge
                  variant="outline"
                  className="text-xs bg-gray-100 text-gray-600 border-gray-200"
                >
                  {t('refunded')}
                </Badge>
              )}
              {order.awaiting_finalization && (
                <Badge
                  variant="outline"
                  className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                >
                  {t('awaitingFinalization')}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isStructurallyLocked && (
              <Button
                onClick={() => setEditOpen(true)}
                size="sm"
                variant="outline"
              >
                <PencilLine className="h-4 w-4 mr-2" />
                {t('editOrder')}
              </Button>
            )}
            {refundDue > 0 && !isRefunded && (
              <Button
                onClick={() => setRefundOpen(true)}
                size="sm"
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('markRefund')}
              </Button>
            )}
            {order.awaiting_finalization && (
              <Button
                onClick={() => setFinalizeOpen(true)}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t('finalizeOrder')}
              </Button>
            )}
            {order.order_status !== "DONE" &&
              order.order_status !== "CANCELLED" && (
                <Button
                  onClick={() => {
                    setCancelResult(null);
                    setCancelReason("");
                    setCancelOpen(true);
                  }}
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {t('cancelOrder')}
                </Button>
              )}
          </div>
        </div>

        {isStructurallyLocked && (
          <div className="rounded-lg border p-3 flex gap-3 text-sm bg-gray-50 border-gray-200 text-gray-600">
            <Lock className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">
                {order.order_status === "CANCELLED"
                  ? t('readOnlyCancelledTitle')
                  : t('readOnlyDoneTitle')}
              </p>
              <p className="text-xs mt-1">{t('readOnlyDesc')}</p>
            </div>
          </div>
        )}

        {unpaidAtServiceStart && (
          <div className="rounded-lg border p-3 flex gap-3 text-sm bg-red-50 border-red-200 text-red-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">
                {t('serviceStartedUnpaidTitle')}
              </p>
              <p className="text-xs mt-1">
                {t('serviceStartedUnpaidBody', { status: order.payment_status.replace("_", " ") })}
              </p>
            </div>
          </div>
        )}

        {order.invoices.length > 0 && invoiceDifference !== 0 && (
          <div
            className={`rounded-lg border p-3 flex gap-3 text-sm ${invoiceDifference > 0 ? "bg-amber-50 border-amber-100 text-amber-800" : "bg-red-50 border-red-100 text-red-700"}`}
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">
                {invoiceDifference > 0
                  ? t('priceHigher')
                  : t('invoiceExceeds')}
              </p>
              <p>
                {t('diffLine', {
                  orderTotal: formatCurrency(orderFinalPrice),
                  invoiceTotal: formatCurrency(alreadyPaid),
                  difference: formatCurrency(invoiceDifference),
                })}
              </p>
              <p className="text-xs mt-1">
                {invoiceDifference > 0
                  ? t('priceHigherHint')
                  : t('invoiceExceedsHint')}
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
                  <CardTitle className="text-base">{t('orderInformation')}</CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-xs ${ORDER_STATUS_STYLES[order.order_status]}`}
                  >
                    {t(ORDER_STATUS_KEYS[order.order_status])}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <InfoRow label={t('primaryPic')} value={order.customer_name} />
                  <InfoRow
                    label={t('primaryPhone')}
                    value={order.customer_phone || "-"}
                  />
                  <InfoRow
                    label={t('orderDate')}
                    value={formatDateTime(order.order_date)}
                  />
                  <InfoRow label={t('serviceDuration')} value={serviceDuration} />
                  <InfoRow
                    label={t('progress')}
                    value={
                      dayProgress
                        ? dayProgress.state === "notStarted"
                          ? t('progressNotStarted')
                          : dayProgress.state === "completed"
                            ? t('progressCompleted')
                            : t('progressDayOf', {
                                current: dayProgress.current,
                                total: dayProgress.total,
                              })
                        : "-"
                    }
                  />
                  <InfoRow
                    label={t('finalPrice')}
                    value={formatCurrency(order.final_price)}
                  />
                </div>
                {order.customers && order.customers.length > 1 && (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">
                      {t('allCustomerPic')}
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
                              {t('primary')}
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
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    {t('serviceDetails')}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {serviceSummary && (
                      <Badge
                        variant="outline"
                        className={
                          serviceSummary.dayCount > 1
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        }
                      >
                        {serviceSummary.dayCount > 1
                          ? t('dayOrder', { count: serviceSummary.dayCount })
                          : t('singleDay')}
                      </Badge>
                    )}
                    {!isStructurallyLocked && hasUnassignedInternalLine && (
                      <Button
                        onClick={() => setAssignOpen(true)}
                        size="sm"
                        className="h-7 gap-1 text-xs"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        {t('assignForAll')}
                      </Button>
                    )}
                    {!isStructurallyLocked && hasReassignableLine && (
                      <Button
                        onClick={() => setReassignOpen(true)}
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        {t('reassignAll')}
                      </Button>
                    )}
                  </div>
                </div>
                {serviceSummary && serviceSummary.dayCount > 1 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('rangeSummary', { range: serviceSummary.rangeLabel, count: serviceSummary.lineCount })}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {serviceSummary ? (
                  <>
                    <div className="space-y-4">
                      {serviceSummary.groups.map((group, gIndex) => (
                        <div key={group.key}>
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="text-sm font-semibold text-gray-900">
                              <span className="inline-flex items-center justify-center rounded bg-indigo-100 text-indigo-700 text-[11px] font-semibold px-1.5 py-0.5 mr-2 align-middle">
                                {t('day', { n: gIndex + 1 })}
                              </span>
                              {group.dateLabel}
                            </p>
                            {group.lines.length > 1 && (
                              <span className="text-[11px] text-gray-400">
                                {t('unitsCount', { count: group.lines.length })}
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            {group.lines.map((item, index) => {
                              const driverLabel =
                                item.driver?.name ||
                                item.external_vendor?.name ||
                                item.driver_name_raw ||
                                null;
                              const carName =
                                item.car?.model ||
                                item.external_car?.model ||
                                item.description ||
                                null;
                              const carPlate =
                                item.car?.plate_number ||
                                item.external_car?.plate_number ||
                                item.plate_raw ||
                                null;
                              const carLabel = [carName, carPlate]
                                .filter(Boolean)
                                .join(" · ");
                              const isLive = item.line_status === "IN_PROGRESS";
                              return (
                                <div
                                  key={item.id || index}
                                  className={`rounded-lg border p-3 ${
                                    isLive
                                      ? "border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-200"
                                      : "border-gray-100 bg-gray-50/70"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-gray-900">
                                        {item.service_kind
                                          ? `${item.service_kind} — `
                                          : ""}
                                        {carName ||
                                          t('serviceDetailNum', { n: index + 1 })}
                                        {isLive && (
                                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 align-middle">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            {t('liveTag')}
                                          </span>
                                        )}
                                        {item.line_status === "CANCELLED" && (
                                          <span className="ml-2 text-[11px] text-red-600">
                                            {t('cancelledTag')}
                                          </span>
                                        )}
                                      </p>
                                      {(item.service_kind ||
                                        item.service_package) && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {item.service_kind && (
                                            <span className="inline-flex items-center rounded bg-blue-50 text-blue-700 text-[10px] font-medium px-1.5 py-0.5">
                                              {item.service_kind}
                                            </span>
                                          )}
                                          {item.service_package && (
                                            <span className="inline-flex items-center rounded bg-amber-50 text-amber-700 text-[10px] font-medium px-1.5 py-0.5">
                                              {item.service_package}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      <p className="text-xs text-gray-500 mt-1">
                                        {item.pickup_location} →{" "}
                                        {item.dropoff_location}
                                      </p>
                                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                                        <span className="inline-flex items-center gap-1">
                                          <Clock className="h-3 w-3 text-gray-400" />
                                          {t('plannedPickup')}:{" "}
                                          {item.start_at
                                            ? formatDateTime(item.start_at)
                                            : "—"}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                          <Clock className="h-3 w-3 text-gray-400" />
                                          {t('plannedDropoff')}:{" "}
                                          {item.end_at
                                            ? formatDateTime(item.end_at)
                                            : "—"}
                                        </span>
                                      </div>
                                      <div className="mt-1.5">
                                        {driverLabel ? (
                                          <span
                                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                                              item.is_external
                                                ? "bg-purple-50 text-purple-700"
                                                : "bg-emerald-50 text-emerald-700"
                                            }`}
                                          >
                                            {driverLabel}
                                            {carLabel ? ` · ${carLabel}` : ""}
                                            {item.is_external ? ` · ${t('vendorTag')}` : ""}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center rounded bg-gray-100 text-gray-500 px-1.5 py-0.5 text-[11px] font-medium">
                                            {t('noDriverAssigned')}
                                          </span>
                                        )}
                                      </div>
                                      {(item.trip_started_at ||
                                        item.trip_finished_at) && (
                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                                          {item.trip_started_at && (
                                            <span className="inline-flex items-center gap-1 text-emerald-700">
                                              <PlayCircle className="h-3 w-3" />
                                              {t('actualStart')}:{" "}
                                              {formatDateTime(item.trip_started_at)}
                                            </span>
                                          )}
                                          {item.trip_finished_at && (
                                            <span className="inline-flex items-center gap-1 text-gray-600">
                                              <CheckCircle2 className="h-3 w-3" />
                                              {t('actualFinish')}:{" "}
                                              {formatDateTime(
                                                item.trip_finished_at,
                                              )}
                                            </span>
                                          )}
                                          {item.trip_started_at &&
                                            item.trip_finished_at && (
                                              <span className="text-gray-400">
                                                ({formatDuration(
                                                  item.trip_started_at,
                                                  item.trip_finished_at,
                                                )})
                                              </span>
                                            )}
                                        </div>
                                      )}
                                      {item.notes && (
                                        <p className="text-xs text-gray-400 mt-1">
                                          {item.notes}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                                      <p className="text-xs text-gray-400">
                                        {t('qty', { qty: item.quantity })}{" "}
                                        {formatCurrency(item.unit_price)}
                                      </p>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {formatCurrency(item.total_price)}
                                      </p>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 gap-1 text-xs"
                                        onClick={() => openDayAssign(item)}
                                      >
                                        <UserCog className="h-3.5 w-3.5" />
                                        {driverLabel ? t('change') : t('assign')}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-200 mt-4 pt-3">
                      <p className="text-xs text-gray-500">
                        {t('totalSummary', {
                          days: t('daysWord', { count: serviceSummary.dayCount }),
                          lines: t('linesWord', { count: serviceSummary.lineCount }),
                        })}
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(serviceSummary.total)}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">
                    {t('noServiceDetails')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Additional Charges */}
            <Card className="shadow-none border border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    {t('additionalCharges')}
                  </CardTitle>
                  {!isStructurallyLocked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAdditionalOpen(true)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> {t('addAdditional')}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {order.adjustments && order.adjustments.length ? (
                  <>
                    <div className="space-y-2">
                      {order.adjustments.map((adj) => (
                        <div
                          key={adj.id}
                          className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/70 p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {adj.description}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {adj.type}
                              {adj.is_billable ? "" : ` · ${t('nonBillable')}`}
                              {adj.created_at
                                ? ` · ${formatDate(adj.created_at)}`
                                : ""}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 shrink-0">
                            {formatCurrency(
                              Number(adj.amount) * (adj.quantity || 1),
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-200 mt-3 pt-3">
                      <p className="text-xs text-gray-500">
                        {t('additionalTotal')}
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(
                          order.adjustments.reduce(
                            (s, a) =>
                              s +
                              (a.is_billable
                                ? Number(a.amount) * (a.quantity || 1)
                                : 0),
                            0,
                          ),
                        )}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">
                    {t('noAdditional')}
                  </p>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Right column — Invoice & Payment */}
          <div className="space-y-6">
            <Card className="shadow-none border border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {t('invoicesPayment')}
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
                    {PAYMENT_STATUS_KEYS[order.payment_status]
                      ? t(PAYMENT_STATUS_KEYS[order.payment_status])
                      : order.payment_status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <InvoiceSection
                  invoices={order.invoices}
                  finalPrice={orderFinalPrice}
                  orderId={order.id}
                  onOpenGenerate={() => setInvoiceOpen(true)}
                  onOpenAdditional={() => setAdditionalInvoiceOpen(true)}
                  onOpenCombined={() => setCombinedInvoiceOpen(true)}
                  onOpenRevise={setRevisionInvoice}
                  onSend={handleSendInvoice}
                  onSendReceipt={handleSendReceipt}
                  onMarkPaid={handleMarkInvoicePaid}
                  sendingInvoiceId={
                    sendInvoiceMutation.isPending
                      ? sendInvoiceMutation.variables?.invoiceId
                      : null
                  }
                  sendingReceiptId={
                    sendReceiptMutation.isPending
                      ? sendReceiptMutation.variables?.invoiceId
                      : null
                  }
                  payingInvoiceId={
                    markInvoicePaidMutation.isPending
                      ? markInvoicePaidMutation.variables?.invoiceId
                      : null
                  }
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Additional Dialog */}
      <Dialog open={additionalOpen} onOpenChange={setAdditionalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addAdditionalCharge')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('type')}</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={adjType}
                onChange={(e) => setAdjType(e.target.value)}
              >
                {ADDITIONAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('labelNote')}</Label>
              <Input
                placeholder={t('labelNotePlaceholder')}
                value={adjDesc}
                onChange={(e) => setAdjDesc(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('amountRp')}</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500">
              {t('addedToFinal')}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdditionalOpen(false)}
              >
                {tc('cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleAddAdditional}
                disabled={addAdjustmentMutation.isPending}
              >
                {addAdjustmentMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('addCharge')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[96vw] max-w-[1280px] max-h-[96vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t('editOrder')}</DialogTitle>
          </DialogHeader>
          <EditOrderForm
            order={order}
            activeInvoiceTotal={alreadyPaid}
            onSubmit={handleUpdateOrder}
            isLoading={updateOrderMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Assign-for-All Dialog: applies one driver/car to every unassigned
          internal service line (the line IS the trip). Per-day overrides are
          done via the line-level dialog below. */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('assignForAll')}</DialogTitle>
            <p className="text-xs text-gray-500">{t('assignForAllHint')}</p>
          </DialogHeader>
          <AssignDriverForm
            onSubmit={handleAssign}
            isLoading={assignMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Reassign (overwrite) driver/car on all not-yet-started lines. */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('reassignAll')}</DialogTitle>
            <p className="text-xs text-gray-500">{t('reassignAllHint')}</p>
          </DialogHeader>
          <AssignDriverForm
            onSubmit={handleReassign}
            isLoading={reassignMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Generate Rental Invoice Dialog */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('invoiceRental')}</DialogTitle>
          </DialogHeader>
          <GenerateInvoiceForm
            finalPrice={orderFinalPrice}
            alreadyPaid={alreadyPaid}
            onSubmit={handleGenerateInvoice}
            isLoading={generateInvoiceMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Per-day driver/car assignment (reuses the Schedule line dialog) */}
      <ScheduleLineDialog
        line={assignLine}
        open={!!assignLine}
        onClose={() => setAssignLine(null)}
      />

      {/* Generate Additional Invoice Dialog */}
      <Dialog
        open={additionalInvoiceOpen}
        onOpenChange={setAdditionalInvoiceOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('invoiceAdditional')}</DialogTitle>
          </DialogHeader>
          <AdditionalInvoiceForm
            finalPrice={orderFinalPrice}
            alreadyPaid={alreadyPaid}
            adjustments={order.adjustments ?? []}
            onSubmit={async (data) => {
              await handleGenerateInvoice(data);
              setAdditionalInvoiceOpen(false);
            }}
            isLoading={generateInvoiceMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Generate Combined (Rental + Additional) Invoice Dialog */}
      <Dialog open={combinedInvoiceOpen} onOpenChange={setCombinedInvoiceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('invoiceCombined')}</DialogTitle>
          </DialogHeader>
          <CombinedInvoiceForm
            rentalBase={rentalBase}
            adjustments={order.adjustments ?? []}
            onSubmit={async (data) => {
              await handleGenerateInvoice(data);
              setCombinedInvoiceOpen(false);
            }}
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
            <DialogTitle>{t('updateInvoice')}</DialogTitle>
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

      {/* Sprint 3: Mark Paid (requires payment proof) */}
      <MarkPaidDialog
        invoice={markPaidInvoice}
        open={!!markPaidInvoice}
        onOpenChange={(v) => {
          if (!v) setMarkPaidInvoice(null);
        }}
        onConfirm={confirmMarkInvoicePaid}
        isSubmittingPaid={markInvoicePaidMutation.isPending}
      />

      <RefundDialog
        refundDue={refundDue}
        open={refundOpen}
        onOpenChange={setRefundOpen}
        onConfirm={handleMarkRefunded}
        isSubmitting={markRefundedMutation.isPending}
      />

      {/* Cancel Order Dialog (applies the Arasya cancellation-fee policy) */}
      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open);
          if (!open) {
            setCancelReason("");
            setCancelResult(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('cancelOrder')}</DialogTitle>
          </DialogHeader>

          {cancelResult ? (
            // ── Result summary after a successful cancellation ──────────────
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-gray-200 p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('cancelTier')}</span>
                  <span className="font-medium">
                    {t('cancelTierValue', { tier: cancelResult.tier })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('cancelPenalty')}</span>
                  <span className="font-semibold text-red-700">
                    {formatCurrency(cancelResult.penalty)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('cancelPaid')}</span>
                  <span className="font-medium">
                    {formatCurrency(cancelResult.paidToDate)}
                  </span>
                </div>
                {cancelResult.refundDue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('cancelRefundDue')}</span>
                    <span className="font-semibold text-amber-700">
                      {formatCurrency(cancelResult.refundDue)}
                    </span>
                  </div>
                )}
                {cancelResult.stillOwed > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('cancelStillOwed')}</span>
                    <span className="font-semibold text-emerald-700">
                      {formatCurrency(cancelResult.stillOwed)}
                    </span>
                  </div>
                )}
              </div>
              {cancelResult.refundDue > 0 && (
                <p className="text-xs text-amber-700">
                  {t('cancelRefundHint')}
                </p>
              )}
              <div className="flex justify-end">
                <Button onClick={() => setCancelOpen(false)} size="sm">
                  {tc('close')}
                </Button>
              </div>
            </div>
          ) : (
            // ── Confirmation form ───────────────────────────────────────────
            <div className="space-y-3">
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex gap-2 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{t('cancelWarning')}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  {t('cancelReasonLabel')}
                </label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={t('cancelReasonPlaceholder')}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelOpen(false)}
                >
                  {tc('cancel')}
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleCancelOrder}
                  disabled={cancelMutation.isPending || !cancelReason.trim()}
                >
                  {cancelMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t('cancelConfirm')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Finalize Order Dialog (admin-authoritative DONE). Ops cost / additional
          / driver fee are SOFT; if additionals exist we remind the admin to
          double-check finance before closing the order. */}
      <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('finalizeOrder')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {order.adjustments && order.adjustments.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{t('finalizeAdditionalWarning')}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-600">{t('finalizeConfirmHint')}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFinalizeOpen(false)}
              >
                {tc('cancel')}
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleFinalizeOrder}
                disabled={finalizeMutation.isPending}
              >
                {finalizeMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('finalizeConfirm')}
              </Button>
            </div>
          </div>
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
