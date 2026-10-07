"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
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
import { RupiahInput } from "@/components/forms/RupiahInput";
import RefundList from "@/components/orders/RefundList";
import { useClientRef } from "@/hooks/useClientRef";
import { formatCurrency } from "@/lib/utils";
import type { OrderMoney, OrderRefund } from "@/types";

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

export interface RefundPayload {
  proof: File;
  amount: number;
  note?: string;
  client_ref: string;
}

// Return saldo lebih to the customer (POST /orders/:id/refunds). Several
// refunds per order, each at most the saldo lebih. Proof REQUIRED: every
// cash movement must be evidenced.
export default function RefundDialog({
  orderId,
  money,
  refunds,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: {
  orderId: string;
  money: OrderMoney;
  refunds: OrderRefund[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  // Resolves true when the refund was recorded.
  onConfirm: (payload: RefundPayload) => Promise<boolean>;
  isSubmitting?: boolean;
}) {
  const t = useTranslations("refund");
  const tc = useTranslations("common");
  const credit = money.credit_balance;
  const [proof, setProof] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  // A new client_ref each time the dialog opens, the same one on a retry.
  const [clientRef, renewClientRef] = useClientRef(open);
  // Prefill the whole saldo lebih when the dialog opens; clear on close (also
  // when the parent closes it after a success). A failed submit keeps input.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setAmount(credit > 0 ? String(credit) : "");
    else reset();
  }

  function reset() {
    setProof(null);
    setFileError(null);
    setAmount("");
    setNote("");
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

  const value = Number(amount || 0);
  const tooMuch = value > credit;
  // Refunding while the customer still owes (a prepayment) leaves piutang.
  const owedAfter = Math.max(0, money.total - (money.net_paid - value));
  const createsDebt = value > 0 && !tooMuch && owedAfter > 0;
  const canSubmit = !!proof && value > 0 && !tooMuch && !isSubmitting;

  async function submit() {
    if (!proof) {
      setFileError(t("proofRequired"));
      return;
    }
    if (!canSubmit) return;
    const ok = await onConfirm({ proof, amount: value, note: note.trim() || undefined, client_ref: clientRef });
    if (ok) renewClientRef();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && isSubmitting) return;
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-x-3">
              <span className="text-sky-900">{t("due")}</span>
              <span className="font-semibold tabular-nums text-sky-900">{formatCurrency(credit)}</span>
            </div>
            <p className="mt-1 text-[11px] text-sky-800/80">{t("dueHint")}</p>
          </div>

          <p className="text-sm text-gray-500">{t("intro")}</p>

          <div className="space-y-1.5">
            <Label htmlFor="refund_amount">{t("amount")}</Label>
            <RupiahInput id="refund_amount" value={amount} onChange={setAmount} />
            {tooMuch ? (
              <p className="text-xs text-red-600">{t("errTooMuch", { amount: formatCurrency(credit) })}</p>
            ) : (
              <p className="text-[11px] text-gray-400">{t("amountHint", { amount: formatCurrency(credit) })}</p>
            )}
          </div>

          {createsDebt && (
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t("createsDebt", { amount: formatCurrency(owedAfter) })}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="refund_proof">
              {t("proofLabel")} <span className="text-red-600">*</span>
            </Label>
            <Input
              id="refund_proof"
              type="file"
              accept={ACCEPT}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {proof && (
              <p className="text-xs text-emerald-600 break-all">
                {proof.name} ({(proof.size / 1024).toFixed(0)} KB)
              </p>
            )}
            {fileError && <p className="text-xs text-red-600">{fileError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="refund_note">{t("noteLabel")}</Label>
            <Input
              id="refund_note"
              placeholder={t("notePlaceholder")}
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {refunds.length > 0 && (
            <div className="space-y-1.5 border-t border-gray-100 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t("earlier")}</p>
              <RefundList orderId={orderId} refunds={refunds} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {tc("cancel")}
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? t("processing") : t("submitBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
