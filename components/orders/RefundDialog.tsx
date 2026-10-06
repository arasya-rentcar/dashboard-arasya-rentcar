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
import { formatCurrency } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

export interface RefundPayload {
  proof: File;
  amount?: number;
  note?: string;
}

// Sprint 5: settle a refund owed to the customer. Refund proof REQUIRED — every
// cash-flow movement must be evidenced.
export default function RefundDialog({
  refundDue,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: {
  refundDue: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (payload: RefundPayload) => Promise<void> | void;
  isSubmitting?: boolean;
}) {
  const t = useTranslations("refund");
  const tc = useTranslations("common");
  const [proof, setProof] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  // Clear the form whenever the dialog closes (also when the parent closes it
  // after a successful submit). A failed submit keeps the picked file.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) reset();
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

  async function submit() {
    if (!proof) {
      setFileError(t("proofRequired"));
      return;
    }
    if (isSubmitting) return;
    await onConfirm({
      proof,
      amount: amount ? Number(amount) : undefined,
      note: note || undefined,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && isSubmitting) return;
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-x-3">
              <span className="text-red-700">{t("due")}</span>
              <span className="font-semibold text-red-700">
                {formatCurrency(refundDue)}
              </span>
            </div>
            <p className="text-[11px] text-red-500/80 mt-1">
              {t("dueHint")}
            </p>
          </div>

          <p className="text-sm text-gray-500">
            {t("intro")}
          </p>

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
            <Label htmlFor="refund_amount">{t("amount")}</Label>
            <Input
              id="refund_amount"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder={refundDue ? String(refundDue) : "0"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-[11px] text-gray-400">
              {t("amountHint", { amount: formatCurrency(refundDue) })}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="refund_note">{t("noteLabel")}</Label>
            <Input
              id="refund_note"
              placeholder={t("notePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
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
          <Button type="button" onClick={submit} disabled={!proof || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? t("processing") : t("submitBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
