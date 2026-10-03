"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useUpdatePayable } from "@/hooks/usePayables";
import { formatCurrency, getErrorMessage } from "@/lib/utils";
import { Payable } from "@/types";

interface Props {
  payable: Payable | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface ExtraRow {
  label: string;
  amount: string;
}

export default function PayableEditDialog({
  payable,
  open,
  onOpenChange,
}: Props) {
  const t = useTranslations("payables");
  const tt = useTranslations("terms");
  const tc = useTranslations("common");
  const update = useUpdatePayable();
  const [keterangan, setKeterangan] = useState("");
  const [extras, setExtras] = useState<ExtraRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (payable) {
      setKeterangan(payable.keterangan ?? "");
      setExtras(
        (payable.extras ?? []).map((e) => ({
          label: e.label,
          amount: String(Number(e.amount)),
        })),
      );
      setError(null);
    }
  }, [payable]);

  // Fee / RTR come from the day (Edit Hari) and reimbursements from approved
  // trip costs; only extras and the note are edited here.
  const baseNum = Number(payable?.base_amount ?? 0);
  const reimburse = Number(payable?.reimburse_amount ?? 0);
  const advance = Number(payable?.advance_amount ?? 0);
  const extrasSum = extras.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const total = baseNum + reimburse - advance + extrasSum;
  const isPaid = payable?.status === "PAID";

  function addExtra() {
    setExtras((x) => [...x, { label: "", amount: "0" }]);
  }
  function removeExtra(i: number) {
    setExtras((x) => x.filter((_, idx) => idx !== i));
  }
  function setExtra(i: number, patch: Partial<ExtraRow>) {
    setExtras((x) => x.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

  async function handleSave() {
    if (!payable) return;
    setError(null);
    try {
      await update.mutateAsync({
        id: payable.id,
        data: {
          keterangan: keterangan || null,
          extras: extras
            .filter((e) => e.label.trim())
            .map((e) => ({ label: e.label.trim(), amount: Number(e.amount) || 0 })),
        },
      });
      onOpenChange(false);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('editTitle', { kind: payable?.kind === "DRIVER" ? tt('driver') : tt('vendor') })}
          </DialogTitle>
        </DialogHeader>

        {payable && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
              <span className="font-medium text-gray-800">
                {payable.driver?.name || payable.vendor?.name || "-"}
              </span>
              {payable.order?.order_code && (
                <span className="ml-2 text-gray-400">
                  #{payable.order.order_code}
                </span>
              )}
            </div>

            {isPaid && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {t('alreadyPaidNote')}
              </p>
            )}

            <div className="space-y-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {payable.kind === "DRIVER" ? t('feeBase') : t('priceBase')}
                </span>
                <span className="font-medium">{formatCurrency(baseNum)}</span>
              </div>
              {payable.kind === "DRIVER" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('reimburseLabel')}</span>
                    <span className="font-medium">{formatCurrency(reimburse)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('advanceLabel')}</span>
                    <span className="font-medium">−{formatCurrency(advance)}</span>
                  </div>
                </>
              )}
              <p className="text-[11px] text-gray-400">{t('baseFromDayHint')}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('extrasLabel')}</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addExtra}
                  className="h-7 gap-1 text-xs"
                >
                  <Plus className="h-3 w-3" /> {t('addExtra')}
                </Button>
              </div>
              {extras.length === 0 && (
                <p className="text-xs text-gray-400">
                  {t('noExtras')}
                </p>
              )}
              {extras.map((e, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={t('extraLabelPlaceholder')}
                    value={e.label}
                    onChange={(ev) => setExtra(i, { label: ev.target.value })}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="0"
                    value={e.amount}
                    onChange={(ev) => setExtra(i, { amount: ev.target.value })}
                    className="w-32"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeExtra(i)}
                    className="h-9 w-9 shrink-0 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>{t('noteLabel')}</Label>
              <Textarea
                rows={2}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder={t('notePlaceholder')}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-gray-900 px-4 py-3 text-white">
              <span className="text-sm font-medium">{t('totalCaps')}</span>
              <span className="text-lg font-bold">{formatCurrency(total)}</span>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={update.isPending || isPaid}>
            {update.isPending ? t('savingBtn') : t('saveBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
