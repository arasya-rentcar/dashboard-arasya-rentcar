"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RupiahInput } from "@/components/forms/RupiahInput";
import type { Invoice, OrderMoney, PaymentStatus } from "@/types";
import { invoiceCash, paymentStatusAfter } from "@/lib/invoiceMoney";
import { formatCurrency, wibDateTimeToIso } from "@/lib/utils";

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "QRIS", "OTHER"] as const;

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

const STATUS_KEYS: Record<PaymentStatus, "statusUnpaid" | "statusDpPaid" | "statusPaid"> = {
  UNPAID: "statusUnpaid",
  DP_PAID: "statusDpPaid",
  PAID: "statusPaid",
};

export interface MarkPaidPayload {
  proof: File;
  payment_method?: string;
  paid_at?: string;
  amount_received?: number;
  amount_mismatch_ack?: boolean;
}

export default function MarkPaidDialog({
  invoice,
  money,
  open,
  onOpenChange,
  onConfirm,
  isSubmittingPaid,
}: {
  invoice: Invoice | null;
  money: OrderMoney;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (payload: MarkPaidPayload) => Promise<void> | void;
  isSubmittingPaid?: boolean;
}) {
  const t = useTranslations("markPaid");
  const tc = useTranslations("common");
  const [proof, setProof] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [method, setMethod] = useState<string>(invoice?.payment_method ?? "CASH");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [ack, setAck] = useState(false);
  const [paidAt, setPaidAt] = useState<string>("");
  const invoiceAmount = invoice ? invoiceCash(invoice) : 0;
  // The dialog stays mounted, so prefill from the invoice each time it opens
  // (method, and the money received = the invoice amount) and clear the form
  // when it closes. A failed submit keeps what was entered.
  const openedFor = open ? (invoice?.id ?? null) : null;
  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  if (openedFor !== syncedFor) {
    setSyncedFor(openedFor);
    if (openedFor) {
      setMethod(invoice?.payment_method ?? "CASH");
      setAmountReceived(invoiceAmount > 0 ? String(invoiceAmount) : "");
      setAck(false);
    } else reset();
  }

  function reset() {
    setProof(null);
    setFileError(null);
    setAmountReceived("");
    setAck(false);
    setPaidAt("");
  }

  function pickFile(f: File | null) {
    setFileError(null);
    if (!f) {
      setProof(null);
      return;
    }
    if (!ACCEPT.split(",").includes(f.type)) {
      setFileError(t("fileTypeError"));
      return;
    }
    if (f.size > MAX_BYTES) {
      setFileError(t("fileSizeError"));
      return;
    }
    setProof(f);
  }

  // What the typed amount does (preview; the API decides and answers 409
  // AMOUNT_MISMATCH without the acknowledgement).
  const received = amountReceived === "" ? invoiceAmount : Number(amountReceived);
  const short = Math.max(0, invoiceAmount - received);
  const over = Math.max(0, received - invoiceAmount);
  const differs = received > 0 && (short > 0 || over > 0);
  const statusAfter = paymentStatusAfter(money, received);
  const statusLabel = t(STATUS_KEYS[statusAfter]);
  const canSubmit = !!proof && received > 0 && (!differs || ack) && !isSubmittingPaid;

  async function submit() {
    if (!proof) {
      setFileError(t("proofRequired"));
      return;
    }
    if (!canSubmit) return;
    await onConfirm({
      proof,
      payment_method: method,
      amount_received: received,
      amount_mismatch_ack: differs ? true : undefined,
      // The picker is WIB wall-clock time, whatever the browser timezone is.
      paid_at: wibDateTimeToIso(paidAt),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && isSubmittingPaid) return;
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="break-words pr-6">
            {t("title", { invoice: invoice?.invoice_number ?? "" })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {t("intro")}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="mark_paid_proof">
              {t("proofLabel")} <span className="text-red-600">*</span>
            </Label>
            <Input
              id="mark_paid_proof"
              type="file"
              accept={ACCEPT}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {proof && (
              <p className="text-xs text-emerald-600 break-all">
                {proof.name} ({(proof.size / 1024).toFixed(0)} KB)
              </p>
            )}
            {fileError && (
              <p className="text-xs text-red-600">{fileError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mark_paid_method">{t("method")}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="mark_paid_method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`methods.${m}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mark_paid_amount">{t("amountReceived")}</Label>
              <RupiahInput
                id="mark_paid_amount"
                value={amountReceived}
                onChange={(v) => {
                  setAmountReceived(v);
                  setAck(false);
                }}
              />
              <p className="text-[11px] text-gray-400">
                {t("amountHint", { amount: formatCurrency(invoiceAmount) })}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mark_paid_at">{t("paymentDate")}</Label>
              <Input
                id="mark_paid_at"
                type="datetime-local"
                step={60}
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
              <p className="text-[11px] text-gray-400">
                {t("paymentDateHint")}
              </p>
            </div>
          </div>

          {differs && (
            <div
              className={`space-y-2 rounded-lg border p-3 text-sm ${
                short > 0
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-sky-200 bg-sky-50 text-sky-900"
              }`}
            >
              <p className="font-medium">
                {short > 0
                  ? t("underpaid", { amount: formatCurrency(short), status: statusLabel })
                  : t("overpaid", { amount: formatCurrency(over) })}
              </p>
              <p className="text-xs">
                {short > 0 ? t("underpaidHint") : t("overpaidHint", { status: statusLabel })}
              </p>
              <label htmlFor="mark_paid_ack" className="flex cursor-pointer items-start gap-2 text-xs">
                <input
                  id="mark_paid_ack"
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-gray-800"
                />
                <span>
                  {t("ackLabel", {
                    received: formatCurrency(received),
                    invoice: formatCurrency(invoiceAmount),
                  })}
                </span>
              </label>
            </div>
          )}

          <p className="text-[11px] leading-snug text-gray-500">
            {t("dpMinHint", { amount: formatCurrency(money.min_dp), status: statusLabel })}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmittingPaid}
          >
            {tc("cancel")}
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit}>
            {isSubmittingPaid && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmittingPaid ? t("processing") : t("markPaidBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
