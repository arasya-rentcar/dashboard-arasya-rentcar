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
import type { Invoice } from "@/types";
import { wibDateTimeToIso } from "@/lib/utils";

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "QRIS", "OTHER"] as const;

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

export interface MarkPaidPayload {
  proof: File;
  payment_method?: string;
  paid_at?: string;
  amount_received?: number;
}

export default function MarkPaidDialog({
  invoice,
  open,
  onOpenChange,
  onConfirm,
  isSubmittingPaid,
}: {
  invoice: Invoice | null;
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
  // S5-polish inputs that ride along here per agreement.
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [paidAt, setPaidAt] = useState<string>("");
  // The dialog stays mounted, so prefill from the invoice each time it opens
  // (the method used to stay on CASH whatever the invoice said) and clear the
  // form when it closes. A failed submit keeps what was entered.
  const openedFor = open ? (invoice?.id ?? null) : null;
  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  if (openedFor !== syncedFor) {
    setSyncedFor(openedFor);
    if (openedFor) setMethod(invoice?.payment_method ?? "CASH");
    else reset();
  }

  function reset() {
    setProof(null);
    setFileError(null);
    setAmountReceived("");
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

  async function submit() {
    if (!proof) {
      setFileError(t("proofRequired"));
      return;
    }
    if (isSubmittingPaid) return;
    await onConfirm({
      proof,
      payment_method: method,
      amount_received: amountReceived ? Number(amountReceived) : undefined,
      // The picker is WIB wall-clock time, whatever the browser timezone is.
      paid_at: wibDateTimeToIso(paidAt),
    });
  }

  const invoiceAmount = invoice ? Number(invoice.amount) : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && isSubmittingPaid) return;
        onOpenChange(v);
      }}
    >
      <DialogContent>
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
              <Input
                id="mark_paid_amount"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder={invoiceAmount ? String(invoiceAmount) : "0"}
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
              />
              <p className="text-[11px] text-gray-400">
                {t("amountHint")}
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
          <Button type="button" onClick={submit} disabled={!proof || isSubmittingPaid}>
            {isSubmittingPaid && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmittingPaid ? t("processing") : t("markPaidBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
