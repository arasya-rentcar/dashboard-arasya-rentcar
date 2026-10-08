"use client";

import { use, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  UserCheck,
  Hourglass,
  Car,
  MapPin,
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
import OrderFinanceCard from "@/components/orders/OrderFinanceCard";
import ArrivalEvidence from "@/components/orders/ArrivalEvidence";
import MapPointLink from "@/components/dashboard/MapPointLink";
import TripCostsPanel from "@/components/orders/TripCostsPanel";
import InvoiceSection from "@/components/orders/InvoiceSection";
import OrderCreditCard from "@/components/orders/OrderCreditCard";
import AssignDriverForm from "@/components/forms/AssignDriverForm";
import GenerateInvoiceForm, {
  type AdjustmentTarget,
} from "@/components/forms/GenerateInvoiceForm";
import AdditionalInvoiceForm from "@/components/forms/AdditionalInvoiceForm";
import CombinedInvoiceForm from "@/components/forms/CombinedInvoiceForm";
import ScheduleLineDialog from "@/components/schedule/ScheduleLineDialog";
import CancelOrderDialog from "@/components/orders/CancelOrderDialog";
import { CancelFeeBadge } from "@/components/orders/DayCancellation";
import type { ScheduleLine, ScheduleStatus, OrderServiceItem } from "@/types";
import ReviseInvoiceForm from "@/components/forms/ReviseInvoiceForm";
import EditOrderForm from "@/components/forms/EditOrderForm";
import {
  DURASI_OPTIONS,
  PAKET_OPTIONS,
} from "@/components/forms/OrderServiceItemsEditor";
import {
  useOrder,
  useReassignOrder,
  useUpdateOrder,
  useGenerateInvoice,
  useReviseInvoice,
  useAddAdjustment,
  useSendInvoiceWhatsapp,
  useSendReceiptWhatsapp,
  useMarkInvoicePaid,
  useCreateRefund,
  useFinalizeOrder,
} from "@/hooks/useOrders";
import {
  apiErrorBody,
  dayLockReason,
  formatCurrency,
  formatDate,
  formatDateTime,
  getErrorMessage,
  isMoneyConflict,
  isoToWibDate,
  openInvoiceExceeds,
} from "@/lib/utils";
import {
  GenerateInvoiceInput,
  Invoice,
  ReviseInvoiceInput,
  OrderStatus,
} from "@/types";
import { ORDER_STATUS_STYLES, PAYMENT_STATUS_STYLES } from "@/lib/statusStyles";
import { openWaWindow, extractWaUrl } from "@/lib/waWindow";
import { itemDropoffPoint, itemPickupPoint } from "@/lib/maps";
import { useClientRef } from "@/hooks/useClientRef";

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
  const td = useTranslations("dayCancel");
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
  // "Tagih kekurangan": the invoice form opened as an Invoice Penyesuaian.
  const [adjustTarget, setAdjustTarget] = useState<AdjustmentTarget | null>(null);
  // Edit Hari on the last open day links here with ?cancel=1 (read once).
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [cancelOpen, setCancelOpen] = useState(
    () => searchParams.get("cancel") === "1",
  );
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [adjType, setAdjType] = useState("OVERTIME");
  const [adjDesc, setAdjDesc] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  // One client_ref per opening of "Tambah Biaya", reused on a retry.
  const [adjClientRef, renewAdjClientRef] = useClientRef(additionalOpen);

  const { data: order, isLoading, isError, refetch } = useOrder(id);
  const reassignMutation = useReassignOrder();
  const finalizeMutation = useFinalizeOrder();
  const updateOrderMutation = useUpdateOrder();
  const generateInvoiceMutation = useGenerateInvoice();
  const reviseInvoiceMutation = useReviseInvoice();
  const addAdjustmentMutation = useAddAdjustment(id);
  const sendInvoiceMutation = useSendInvoiceWhatsapp();
  const sendReceiptMutation = useSendReceiptWhatsapp();
  const markInvoicePaidMutation = useMarkInvoicePaid();
  const createRefundMutation = useCreateRefund();

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
    const wa = openWaWindow();
    try {
      const result = await sendInvoiceMutation.mutateAsync({
        id,
        invoiceId: invoice.id,
        data: { target_phone: phone, target_name: name },
      });
      if (wa.finish(extractWaUrl(result))) toast.success(tc("waOpened"));
      else toast.success(t("okInvoiceSent", { number: invoice.invoice_number }));
    } catch (err) {
      wa.cancel();
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
    const wa = openWaWindow();
    try {
      const result = await sendReceiptMutation.mutateAsync({
        id,
        invoiceId: invoice.id,
        data: { target_phone: phone, target_name: name },
      });
      if (wa.finish(extractWaUrl(result))) toast.success(tc("waOpened"));
      else toast.success(t("okReceiptSent", { number: invoice.invoice_number }));
    } catch (err) {
      wa.cancel();
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
    amount_mismatch_ack?: boolean;
  }) {
    if (!markPaidInvoice) return;
    try {
      const result = await markInvoicePaidMutation.mutateAsync({
        id,
        invoiceId: markPaidInvoice.id,
        data: payload,
      });
      const number = markPaidInvoice.invoice_number;
      const p = result.payment;
      toast.success(
        p && p.shortfall > 0
          ? t("okMarkedPaidShort", { number, amount: formatCurrency(p.shortfall) })
          : p && p.credit_added > 0
            ? t("okMarkedPaidOver", { number, amount: formatCurrency(p.credit_added) })
            : t("okMarkedPaid", { number }),
      );
      setMarkPaidInvoice(null);
    } catch (err) {
      // AMOUNT_MISMATCH etc.: the API message says what to do; the dialog
      // stays open with what was entered.
      toast.error(getErrorMessage(err));
      if (isMoneyConflict(err)) refetch();
    }
  }

  const ADDITIONAL_TYPES: { label: string; value: string }[] = [
    { label: t("typeOvertime"), value: "OVERTIME" },
    { label: t("typeParking"), value: "PARKING" },
    { label: t("typeToll"), value: "TOLL" },
    { label: t("typeAdditional"), value: "OTHER" },
  ];

  // Display labels for every adjustment type the API can return (the form
  // above only offers the ones admins add by hand).
  const ADJUSTMENT_TYPE_LABELS: Record<string, string> = {
    ...Object.fromEntries(ADDITIONAL_TYPES.map((at) => [at.value, at.label])),
    EXTRA_DESTINATION: t("typeExtraDestination"),
    FUEL: t("typeFuel"),
    DISCOUNT: t("typeDiscount"),
  };

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
        client_ref: adjClientRef,
      });
      renewAdjClientRef();
      toast.success(t("okAdditionalAdded"));
      setAdditionalOpen(false);
      setAdjType("OVERTIME");
      setAdjDesc("");
      setAdjAmount("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  // Every money figure comes from the API's money model (order.money, rule
  // set v3); the page never adds up invoice amounts itself.
  const money = order?.money;
  // Paid toward the total, or billed and not paid yet.
  const billedSoFar = money ? money.covered + money.open_billed : 0;
  // > 0: part of the total has no invoice yet; < 0: paid + billed exceed it.
  const invoiceDifference = money ? money.total - billedSoFar : 0;
  // Saldo lebih can be refunded whenever there is some (several refunds per order).
  const creditBalance = money?.credit_balance ?? 0;
  const refundedTotal = money?.refunded ?? 0;
  // Terminal orders are read-only for STRUCTURAL data (fields, service lines,
  // driver assignment, price adjustments). Billing/closure (invoices, payment,
  // receipt, refund) stays available because it happens after DONE / on a
  // cancelled order. Mirrors the API guard (assertOrderStructurallyEditable).
  // A cancel after some days were done leaves the order open (it closes through
  // finalize) but its total is the cancellation fee, so it is locked the same.
  const isPartlyCancelled =
    order?.cancellation_fee != null && order.order_status !== "CANCELLED";
  const isStructurallyLocked =
    order?.order_status === "DONE" ||
    order?.order_status === "CANCELLED" ||
    isPartlyCancelled;
  // Why the per-day Change/Assign button is disabled (short text under it).
  const dayLock = dayLockReason(order?.order_status);
  // Rental base = sum of service lines (excludes billable additionals, which the
  // combined invoice adds back explicitly).
  const rentalBase = (order?.service_items ?? []).reduce(
    (sum, item) => sum + Number(item.total_price || 0),
    0,
  );
  // The line IS the trip. Drivers are given per day (the "Assign for All"
  // button was retired); this only drives the "pay the DP first" hint.
  const hasUnassignedInternalLine = (order?.service_items ?? []).some(
    (item) =>
      !item.is_external &&
      item.line_status !== "CANCELLED" &&
      !item.driver?.id,
  );
  // Drivers are assigned only once the DP (or full payment) is recorded; the
  // API rejects it otherwise. Partner (external) lines are not affected.
  const awaitingDp = order?.payment_status === "UNPAID";
  // Owner rule: the trip with the customer begins only when the order is paid
  // in full (driver app "Mulai perjalanan"); driving to the pickup is allowed.
  const waitsForFullPayment =
    !!money &&
    !money.start_ready &&
    order?.order_status !== "CANCELLED" &&
    (order?.service_items ?? []).some(
      (item) =>
        !item.is_external &&
        !!item.driver?.id &&
        item.line_status !== "DONE" &&
        item.line_status !== "CANCELLED" &&
        !item.customer_onboard_at,
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
  // WIB service dates (YYYY-MM-DD) of the internal lines still being assigned
  // (not started, not cancelled). Feeds AssignDriverForm so drivers/cars busy
  // on any of these dates render disabled (show-but-disable).
  const assignableServiceDates = Array.from(
    new Set(
      (order?.service_items ?? [])
        .filter(
          (item) =>
            !item.is_external &&
            item.line_status !== "CANCELLED" &&
            item.line_status !== "IN_PROGRESS" &&
            item.line_status !== "DONE" &&
            !!item.service_date,
        )
        // WIB calendar day (service_date is WIB midnight = 17:00Z the day before).
        .map((item) => isoToWibDate(String(item.service_date))),
    ),
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
  // "2 hr 3 jam 15 mnt" / "2d 3h 15m"
  const durationUnits = {
    days: (n: number) => t("durDays", { n }),
    hours: (n: number) => t("durHours", { n }),
    minutes: (n: number) => t("durMinutes", { n }),
  };
  const serviceDuration =
    serviceStart && serviceEnd
      ? formatDuration(serviceStart, serviceEnd, durationUnits)
      : t("notFinishedYet");
  const kindLabel = (v?: string | null) =>
    DURASI_OPTIONS.find((o) => o.value === v)?.label ?? v ?? "";
  const packageLabel = (v?: string | null) =>
    PAKET_OPTIONS.find((o) => o.value === v)?.label ?? v ?? "";
  const paymentStatusLabel = (status: string) =>
    PAYMENT_STATUS_KEYS[status]
      ? t(PAYMENT_STATUS_KEYS[status])
      : status.replace("_", " ");

  const serviceSummary = (() => {
    const items = order?.service_items ?? [];
    if (!items.length) return null;
    const dayKey = (d?: string | null) =>
      d ? isoToWibDate(d) : "no-date";

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
      .map((d) => isoToWibDate(d))
      .sort();
    // Same as the API's dayBillable: a cancelled day counts at its fee.
    const total = items.reduce(
      (sum, it) =>
        sum +
        Number(
          it.line_status === "CANCELLED" ? it.cancel_fee ?? 0 : it.total_price || 0,
        ),
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
    const todayKey = isoToWibDate(new Date().toISOString());
    const datedKeys = groups
      .map((g) => (g.date ? isoToWibDate(g.date) : null))
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

  async function handleReassign(data: { driver_id: string; car_id: string }) {
    try {
      await reassignMutation.mutateAsync({ id, data });
      toast.success(t("okDriverReassigned"));
      setReassignOpen(false);
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
      driver_fee: item.driver_fee ?? null,
      driver_fee_note: item.driver_fee_note ?? null,
      travel_advance: item.travel_advance ?? null,
      payable: item.payable
        ? { status: item.payable.status, extras_amount: item.payable.extras_amount }
        : null,
      margin_amount: item.margin_amount ?? null,
      is_external: item.is_external ?? false,
      line_status: (item.line_status as ScheduleStatus) ?? "SCHEDULED",
      driver_name_raw: item.driver_name_raw ?? null,
      driver_phone_raw: item.driver_phone_raw ?? null,
      plate_raw: item.plate_raw ?? null,
      notes: item.notes ?? null,
      cancel_fee: item.cancel_fee ?? null,
      cancel_fee_auto: item.cancel_fee_auto ?? null,
      cancel_tier: item.cancel_tier ?? null,
      order: {
        id: order.id,
        order_code:
          (order as { order_code?: string | null }).order_code ?? null,
        customer_name: order.customer_name,
        order_status: order.order_status,
        payment_status: order.payment_status,
        start_ready: order.money?.start_ready,
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
      const exceeds = openInvoiceExceeds(err);
      if (apiErrorBody(err)?.code === "DAY_DELETE_NEEDS_CANCEL") {
        toast.error(td("dayDeleteNeedsCancel"));
      } else if (exceeds) {
        toast.error(
          td("openInvoiceExceeds", {
            open: formatCurrency(exceeds.open_billed),
            max: formatCurrency(exceeds.max_open_billed),
            total: formatCurrency(exceeds.new_total),
          }),
        );
      } else {
        toast.error(getErrorMessage(err));
      }
    }
  }

  // Resolves true when the invoice was made, so the form renews its client_ref;
  // on an error the dialog stays open and a retry reuses it.
  async function handleGenerateInvoice(data: GenerateInvoiceInput): Promise<boolean> {
    try {
      const inv = await generateInvoiceMutation.mutateAsync({ id, data });
      // Saldo lebih covered it all: the API made it PAID at once.
      toast.success(
        inv?.status === "PAID" ? t("okInvoicePaidByCredit") : t("okInvoiceGenerated"),
      );
      setInvoiceOpen(false);
      setAdjustTarget(null);
      return true;
    } catch (err) {
      // CREDIT_CHANGED or a cap: show the API message, keep the form open and
      // refetch so it shows the new numbers (same client_ref on the retry).
      toast.error(getErrorMessage(err));
      if (isMoneyConflict(err)) refetch();
      return false;
    }
  }

  async function handleCreateRefund(payload: RefundPayload): Promise<boolean> {
    try {
      const result = await createRefundMutation.mutateAsync({ id, data: payload });
      toast.success(
        result.outstanding_after > 0
          ? t("okRefundOwed", { amount: formatCurrency(result.outstanding_after) })
          : t("okRefundMarked"),
      );
      setRefundOpen(false);
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
      if (isMoneyConflict(err)) refetch();
      return false;
    }
  }

  async function handleReviseInvoice(data: ReviseInvoiceInput): Promise<boolean> {
    if (!revisionInvoice) return false;
    try {
      await reviseInvoiceMutation.mutateAsync({
        id,
        invoiceId: revisionInvoice.id,
        data,
      });
      toast.success(t("okRevisionCreated"));
      setRevisionInvoice(null);
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
      if (isMoneyConflict(err)) refetch();
      return false;
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <Button variant="ghost" size="sm" asChild className="-ml-2">
              <Link href="/dashboard/orders">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t('orders')}
              </Link>
            </Button>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-gray-900 break-all">
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
                {paymentStatusLabel(order.payment_status)}
              </Badge>
              {creditBalance > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs bg-sky-50 text-sky-800 border-sky-200"
                >
                  {t('creditBadge', { amount: formatCurrency(creditBalance) })}
                </Badge>
              )}
              {refundedTotal > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs bg-gray-100 text-gray-600 border-gray-200"
                >
                  {t('refundedBadge', { amount: formatCurrency(refundedTotal) })}
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
          <div className="flex flex-wrap items-center gap-2">
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
            {creditBalance > 0 && (
              <Button
                onClick={() => setRefundOpen(true)}
                size="sm"
                variant="outline"
                className="border-sky-300 text-sky-800 hover:bg-sky-50"
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
            {/* Nothing left to cancel once every day is done: finalize instead. */}
            {order.order_status !== "DONE" &&
              order.order_status !== "CANCELLED" &&
              !isPartlyCancelled &&
              !order.awaiting_finalization && (
                <Button
                  onClick={() => setCancelOpen(true)}
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
                  : isPartlyCancelled
                    ? t('partialCancelTitle')
                    : t('readOnlyDoneTitle')}
              </p>
              <p className="text-xs mt-1">
                {isPartlyCancelled
                  ? t('partialCancelDesc', {
                      date: order.cancelled_at ? formatDateTime(order.cancelled_at) : '—',
                      fee: formatCurrency(Number(order.cancellation_fee)),
                      reason: order.cancellation_reason || '—',
                    })
                  : t('readOnlyDesc')}
              </p>
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
                {t('serviceStartedUnpaidBody', { status: paymentStatusLabel(order.payment_status) })}
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
                  orderTotal: formatCurrency(money?.total ?? 0),
                  invoiceTotal: formatCurrency(billedSoFar),
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

        {/* The invoice column keeps a usable width (20-24rem) on desktop; with
            thirds it was only ~176px wide at 1024px. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
          {/* Left column — Order + Trip */}
          <div className="min-w-0 space-y-6">
            {/* Order Information */}
            <Card className="shadow-none border border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
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
                  {order.notes?.trim() && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-400 mb-0.5">
                        {t('orderNotes')}
                      </p>
                      <p className="text-sm text-gray-900 whitespace-pre-line">
                        {order.notes}
                      </p>
                    </div>
                  )}
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
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 break-words">
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

            {order.web_lead && (
              <Card className="shadow-none border border-gray-200">
                <CardHeader className="pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {t('webLeadTitle')}
                      <span className="font-mono text-sm font-semibold text-gray-700">
                        {order.web_lead.lead_code}
                      </span>
                    </CardTitle>
                    <Link
                      href={`/dashboard/leads?q=${encodeURIComponent(order.web_lead.lead_code)}`}
                      className="inline-flex min-h-8 items-center text-xs font-medium text-blue-600 hover:underline"
                    >
                      {t('webLeadOpen')}
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <InfoRow
                      label={t('webLeadReceived')}
                      value={formatDateTime(order.web_lead.created_at)}
                    />
                    <InfoRow
                      label={t('webLeadSource')}
                      value={order.web_lead.page_path || "-"}
                    />
                    <InfoRow
                      label={t('webLeadCampaign')}
                      value={
                        [order.web_lead.campaign, order.web_lead.gclid && `gclid ${order.web_lead.gclid}`]
                          .filter(Boolean)
                          .join(" · ") || "-"
                      }
                    />
                    <InfoRow
                      label={t('webLeadLanguage')}
                      value={order.web_lead.language?.toUpperCase() || "-"}
                    />
                    <InfoRow
                      label={t('webLeadUnit')}
                      value={order.web_lead.unit || "-"}
                    />
                    <InfoRow
                      label={t('webLeadPax')}
                      value={
                        order.web_lead.passenger_count
                          ? String(order.web_lead.passenger_count)
                          : "-"
                      }
                    />
                    <InfoRow
                      label={t('webLeadDuration')}
                      value={order.web_lead.duration || "-"}
                    />
                    {order.web_lead.notes?.trim() && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400 mb-0.5">
                          {t('webLeadNotes')}
                        </p>
                        <p className="text-sm italic text-gray-900 whitespace-pre-line">
                          “{order.web_lead.notes}”
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <OrderFinanceCard order={order} />

            <Card className="shadow-none border border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <CardTitle className="text-base">
                    {t('serviceDetails')}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
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
                    {!isStructurallyLocked && !awaitingDp && hasReassignableLine && (
                      <Button
                        type="button"
                        onClick={() => setReassignOpen(true)}
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-xs"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        {t('reassignAll')}
                      </Button>
                    )}
                  </div>
                </div>
                {waitsForFullPayment && money && (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {t('notPaidForTrip', {
                      left: formatCurrency(Math.max(0, money.base - money.net_paid)),
                    })}
                  </p>
                )}
                {!isStructurallyLocked && awaitingDp && hasUnassignedInternalLine && (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {t('awaitingDpAssign')}
                  </p>
                )}
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
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
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
                              const carPlate = item.is_external
                                ? item.plate_raw ||
                                  item.external_car?.plate_number ||
                                  null
                                : item.car?.plate_number ||
                                  item.external_car?.plate_number ||
                                  item.plate_raw ||
                                  null;
                              const carLabel = [carName, carPlate]
                                .filter(Boolean)
                                .join(" · ");
                              const isLive = item.line_status === "IN_PROGRESS";
                              // Internal driver set but the trip not yet accepted
                              // in the driver app.
                              const awaitingAccept =
                                !!item.driver?.id &&
                                !item.driver_accepted_at &&
                                (item.line_status === "SCHEDULED" ||
                                  item.line_status === "ASSIGNED");
                              return (
                                <div
                                  key={item.id || index}
                                  className={`rounded-lg border p-3 ${
                                    isLive
                                      ? "border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-200"
                                      : "border-gray-100 bg-gray-50/70"
                                  }`}
                                >
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-gray-900">
                                        {item.service_kind
                                          ? `${kindLabel(item.service_kind)} — `
                                          : ""}
                                        {carName ||
                                          t('serviceDetailNum', { n: index + 1 })}
                                        {isLive && (
                                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 align-middle">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            {t('liveTag')}
                                          </span>
                                        )}
                                        {item.line_status === "CANCELLED" &&
                                          (item.cancel_fee != null ? (
                                            <CancelFeeBadge line={item} className="ml-2 align-middle" />
                                          ) : (
                                            <span className="ml-2 text-[11px] text-red-600">
                                              {t('cancelledTag')}
                                            </span>
                                          ))}
                                      </p>
                                      {(item.service_kind ||
                                        item.service_package) && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {item.service_kind && (
                                            <span className="inline-flex items-center rounded bg-blue-50 text-blue-700 text-[10px] font-medium px-1.5 py-0.5">
                                              {kindLabel(item.service_kind)}
                                            </span>
                                          )}
                                          {item.service_package && (
                                            <span className="inline-flex items-center rounded bg-amber-50 text-amber-700 text-[10px] font-medium px-1.5 py-0.5">
                                              {packageLabel(item.service_package)}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      <p className="text-xs text-gray-500 mt-1 break-words">
                                        {item.pickup_location} →{" "}
                                        {item.dropoff_location}
                                      </p>
                                      <ItemPointLinks item={item} />
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
                                            className={`inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium break-words ${
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
                                      {item.is_external &&
                                        (item.driver_name_raw ||
                                          item.driver_phone_raw) && (
                                          <p className="mt-1.5 text-[11px] text-purple-700">
                                            {t('partnerDriver')}:{" "}
                                            {[
                                              item.driver_name_raw,
                                              item.driver_phone_raw,
                                            ]
                                              .filter(Boolean)
                                              .join(" · ")}
                                          </p>
                                        )}
                                      {(item.driver_accepted_at ||
                                        awaitingAccept) && (
                                        <div className="mt-1.5 text-[11px]">
                                          {item.driver_accepted_at ? (
                                            <span className="inline-flex items-center gap-1 text-blue-700">
                                              <UserCheck className="h-3 w-3" />
                                              {t('driverAccepted')}:{" "}
                                              {formatDateTime(item.driver_accepted_at)}
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-gray-400 italic">
                                              <Hourglass className="h-3 w-3" />
                                              {t('driverNotAccepted')}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {(item.actual_start_at ||
                                        item.actual_pickup_at) && (
                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
                                          {item.actual_start_at && (
                                            <span className="inline-flex items-center gap-1">
                                              <Car className="h-3 w-3 text-gray-400" />
                                              {t('actualDeparted')}:{" "}
                                              {formatDateTime(item.actual_start_at)}
                                            </span>
                                          )}
                                          {item.actual_pickup_at && (
                                            <span className="inline-flex items-center gap-1">
                                              <MapPin className="h-3 w-3 text-gray-400" />
                                              {t('actualArrivedPickup')}:{" "}
                                              {formatDateTime(item.actual_pickup_at)}
                                            </span>
                                          )}
                                          {item.customer_onboard_at && (
                                            <span className="inline-flex items-center gap-1 text-emerald-700">
                                              <UserCheck className="h-3 w-3" />
                                              {t('actualOnboard')}:{" "}
                                              {formatDateTime(item.customer_onboard_at)}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-gray-200/70 pt-2 sm:flex-col sm:items-end sm:border-0 sm:pt-0 sm:text-right">
                                      <p className="text-xs text-gray-400 whitespace-nowrap">
                                        {t('qty', { qty: item.quantity })}{" "}
                                        {formatCurrency(item.unit_price)}
                                      </p>
                                      <p className="text-sm font-semibold text-gray-900 whitespace-nowrap tabular-nums">
                                        {formatCurrency(item.total_price)}
                                      </p>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="ml-auto h-8 gap-1 text-xs sm:ml-0"
                                        disabled={!!dayLock}
                                        title={dayLock ? tc(dayLock) : undefined}
                                        onClick={() => openDayAssign(item)}
                                      >
                                        <UserCog className="h-3.5 w-3.5" />
                                        {driverLabel ? t('change') : t('assign')}
                                      </Button>
                                      {dayLock && (
                                        <p className="basis-full text-[10px] sm:max-w-[10rem] sm:basis-auto sm:text-right leading-tight text-gray-400">
                                          {tc(dayLock)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {!item.is_external && (
                                    <ArrivalEvidence
                                      reports={item.reports}
                                      pickupLocation={item.pickup_location}
                                      pickupPoint={itemPickupPoint(item)}
                                      arrivedAt={item.actual_pickup_at}
                                    />
                                  )}
                                  {item.id && (
                                    <TripCostsPanel
                                      lineId={item.id}
                                      costs={item.expenses}
                                      payable={item.payable}
                                      isExternal={item.is_external}
                                      readOnly={order.order_status === "DONE"}
                                    />
                                  )}
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
                                              durationUnits,
                                            )})
                                          </span>
                                        )}
                                    </div>
                                  )}
                                  {item.notes && (
                                    <p className="text-xs text-gray-400 mt-1 break-words whitespace-pre-line">
                                      {item.notes}
                                    </p>
                                  )}
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
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
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
                            <p className="text-sm font-medium text-gray-900 break-words">
                              {adj.description}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {ADJUSTMENT_TYPE_LABELS[adj.type] ?? adj.type}
                              {adj.is_billable ? "" : ` · ${t('nonBillable')}`}
                              {adj.created_at
                                ? ` · ${formatDate(adj.created_at)}`
                                : ""}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 shrink-0 tabular-nums">
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
          <div className="min-w-0 space-y-6">
            <Card className="shadow-none border border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
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
                    {paymentStatusLabel(order.payment_status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <InvoiceSection
                  invoices={order.invoices}
                  money={order.money}
                  orderId={order.id}
                  onOpenGenerate={() => {
                    setAdjustTarget(null);
                    setInvoiceOpen(true);
                  }}
                  onBillShortfall={(inv, room) => {
                    setAdjustTarget({ invoiceId: inv.id, invoiceNumber: inv.invoice_number, room });
                    setInvoiceOpen(true);
                  }}
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

            <OrderCreditCard
              orderId={order.id}
              money={order.money}
              refunds={order.refunds ?? []}
              entries={order.credit_entries ?? []}
              onRefund={() => setRefundOpen(true)}
            />
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
              <Label htmlFor="adj-type">{t('type')}</Label>
              <select
                id="adj-type"
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-xs md:text-sm"
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
              <Label htmlFor="adj-desc">{t('labelNote')}</Label>
              <Input
                id="adj-desc"
                placeholder={t('labelNotePlaceholder')}
                value={adjDesc}
                onChange={(e) => setAdjDesc(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-amount">{t('amountRp')}</Label>
              <Input
                id="adj-amount"
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="0"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500">
              {t('addedToFinal')}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={addAdjustmentMutation.isPending}
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
        <DialogContent className="flex w-[calc(100%-1rem)] max-w-[1280px] max-h-[calc(100dvh-1rem)] flex-col gap-3 overflow-hidden p-4 sm:w-[96vw] sm:max-h-[96dvh] sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t('editOrder')}</DialogTitle>
          </DialogHeader>
          <EditOrderForm
            order={order}
            activeInvoiceTotal={billedSoFar}
            onSubmit={handleUpdateOrder}
            isLoading={updateOrderMutation.isPending}
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
            serviceDates={assignableServiceDates}
          />
        </DialogContent>
      </Dialog>

      {/* Generate Rental Invoice Dialog */}
      <Dialog
        open={invoiceOpen}
        onOpenChange={(open) => {
          setInvoiceOpen(open);
          if (!open) setAdjustTarget(null);
        }}
      >
        <DialogContent className="max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{adjustTarget ? t('invoiceAdjustment') : t('invoiceRental')}</DialogTitle>
          </DialogHeader>
          <GenerateInvoiceForm
            money={order.money}
            adjustment={adjustTarget}
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
        onCancelOrder={() => {
          setAssignLine(null);
          setCancelOpen(true);
        }}
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
            money={order.money}
            adjustments={order.adjustments ?? []}
            onSubmit={async (data) => {
              const ok = await handleGenerateInvoice(data);
              if (ok) setAdditionalInvoiceOpen(false);
              return ok;
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
              const ok = await handleGenerateInvoice(data);
              if (ok) setCombinedInvoiceOpen(false);
              return ok;
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
              money={order.money}
              onSubmit={handleReviseInvoice}
              isLoading={reviseInvoiceMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Sprint 3: Mark Paid (requires payment proof) */}
      <MarkPaidDialog
        invoice={markPaidInvoice}
        money={order.money}
        open={!!markPaidInvoice}
        onOpenChange={(v) => {
          if (!v) setMarkPaidInvoice(null);
        }}
        onConfirm={confirmMarkInvoicePaid}
        isSubmittingPaid={markInvoicePaidMutation.isPending}
      />

      <RefundDialog
        orderId={order.id}
        money={order.money}
        refunds={order.refunds ?? []}
        open={refundOpen}
        onOpenChange={setRefundOpen}
        onConfirm={handleCreateRefund}
        isSubmitting={createRefundMutation.isPending}
      />

      {/* Batalkan Pesanan: per-day cancellation fees from the API quote. */}
      <CancelOrderDialog
        orderId={id}
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open);
          // Drop ?cancel=1 so a reload does not open it again.
          if (!open && searchParams.has("cancel")) router.replace(pathname);
        }}
      />

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
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={finalizeMutation.isPending}
                onClick={() => setFinalizeOpen(false)}
              >
                {tc('cancel')}
              </Button>
              <Button
                type="button"
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

function formatDuration(
  start: string,
  end: string,
  units: {
    days: (n: number) => string;
    hours: (n: number) => string;
    minutes: (n: number) => string;
  },
) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "-";
  const totalMinutes = Math.round(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(units.days(days));
  if (hours) parts.push(units.hours(hours));
  if (minutes || !parts.length) parts.push(units.minutes(minutes));
  return parts.join(" ");
}

// Map links for a day's pickup / dropoff points (website map picker). Renders
// nothing for days without points.
function ItemPointLinks({ item }: { item: OrderServiceItem }) {
  const t = useTranslations("maps");
  const pickup = itemPickupPoint(item);
  const dropoff = itemDropoffPoint(item);
  if (!pickup && !dropoff) return null;
  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
      <MapPin className="h-3 w-3 text-gray-400" aria-hidden="true" />
      {pickup && (
        <MapPointLink point={pickup} label={t("pickupPoint")}>
          {t("pickupPoint")}
        </MapPointLink>
      )}
      {dropoff && (
        <MapPointLink point={dropoff} label={t("destinationPoint")}>
          {t("destinationPoint")}
        </MapPointLink>
      )}
    </p>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 break-words">{value}</p>
    </div>
  );
}
