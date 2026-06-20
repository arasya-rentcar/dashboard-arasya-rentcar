"use client";

import { useState } from "react";
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
    await onConfirm({
      proof,
      amount: amount ? Number(amount) : undefined,
      note: note || undefined,
    });
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-sm">
            <div className="flex justify-between">
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
            <Label>
              {t("proofLabel")} <span className="text-red-600">*</span>
            </Label>
            <Input
              type="file"
              accept={ACCEPT}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {proof && (
              <p className="text-xs text-emerald-600">
                {proof.name} ({(proof.size / 1024).toFixed(0)} KB)
              </p>
            )}
            {fileError && <p className="text-xs text-red-600">{fileError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>{t("amount")}</Label>
            <Input
              type="number"
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
            <Label>{t("noteLabel")}</Label>
            <Input
              placeholder={t("notePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {tc("cancel")}
          </Button>
          <Button onClick={submit} disabled={!proof || isSubmitting}>
            {isSubmitting ? t("processing") : t("submitBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
