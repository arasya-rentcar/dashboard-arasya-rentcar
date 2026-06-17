'use client';

import { useState } from 'react';
import { Wallet, PencilLine } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateOrderFinance } from '@/hooks/useOrders';
import { formatCurrency, getErrorMessage } from '@/lib/utils';
import { Order } from '@/types';

const num = (v?: string | number | null) =>
  v == null || v === '' ? '' : String(v);

export default function OrderFinanceCard({ order }: { order: Order }) {
  const fin = order.final_finance;
  const isExternal = !!order.is_external;
  const [open, setOpen] = useState(false);
  const mutation = useUpdateOrderFinance();

  const [form, setForm] = useState({
    total_user_amount: num(fin?.total_user_amount ?? order.final_price),
    sell_price: num(fin?.sell_price),
    rtr_amount: num(fin?.rtr_amount),
    total_ops_cost: num(fin?.total_ops_cost),
    total_driver_amount: num(fin?.total_driver_amount),
    finance_note: fin?.finance_note ?? '',
  });

  function openEditor() {
    setForm({
      total_user_amount: num(fin?.total_user_amount ?? order.final_price),
      sell_price: num(fin?.sell_price),
      rtr_amount: num(fin?.rtr_amount),
      total_ops_cost: num(fin?.total_ops_cost),
      total_driver_amount: num(fin?.total_driver_amount),
      finance_note: fin?.finance_note ?? '',
    });
    setOpen(true);
  }

  const toNum = (s: string) =>
    s.trim() === '' ? null : Number(s.replace(/[^\d.-]/g, ''));

  // live margin preview
  const u = Number(toNum(form.total_user_amount) ?? 0);
  const sell = Number(toNum(form.sell_price) ?? 0);
  const rtr = Number(toNum(form.rtr_amount) ?? 0);
  const ops = Number(toNum(form.total_ops_cost) ?? 0);
  const previewMargin = isExternal
    ? (toNum(form.total_user_amount) != null ? u : sell) - rtr
    : u - ops;

  async function save() {
    try {
      await mutation.mutateAsync({
        id: order.id,
        data: {
          total_user_amount: toNum(form.total_user_amount),
          sell_price: toNum(form.sell_price),
          rtr_amount: toNum(form.rtr_amount),
          total_ops_cost: toNum(form.total_ops_cost),
          total_driver_amount: toNum(form.total_driver_amount),
          finance_note: form.finance_note.trim() || null,
        },
      });
      toast.success('Finance saved — margin recomputed');
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <Card className="shadow-none border border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-gray-400" /> Finance & Margin
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs ${
                isExternal
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {isExternal ? 'External' : 'Internal'}
            </Badge>
            <Button size="sm" variant="outline" onClick={openEditor}>
              <PencilLine className="h-4 w-4 mr-1" /> Edit Finance
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {order.external_vendor && (
          <p className="text-xs text-gray-500 mb-3">
            Vendor:{' '}
            <span className="font-medium text-gray-700">
              {order.external_vendor.name}
            </span>
            {order.external_car
              ? ` · ${order.external_car.model}${order.external_car.plate_number ? ` (${order.external_car.plate_number})` : ''}`
              : ''}
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <Stat label="Total User" value={fin?.total_user_amount} />
          {isExternal ? (
            <>
              <Stat label="Sell Price" value={fin?.sell_price} />
              <Stat label="RTR" value={fin?.rtr_amount} />
            </>
          ) : (
            <>
              <Stat label="Ops Cost" value={fin?.total_ops_cost} />
              <Stat label="Driver Cost" value={fin?.total_driver_amount} />
            </>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">
              Margin
              <span className="ml-1 normal-case">
                ({isExternal ? 'User − RTR' : 'User − Ops'})
              </span>
            </p>
            <p
              className={`text-lg font-semibold ${
                fin?.margin_amount == null
                  ? 'text-gray-400'
                  : Number(fin.margin_amount) >= 0
                    ? 'text-emerald-600'
                    : 'text-red-600'
              }`}
            >
              {fin?.margin_amount == null
                ? 'Not set'
                : formatCurrency(fin.margin_amount)}
            </p>
          </div>
          {fin?.finance_note && (
            <p className="text-xs text-gray-500 max-w-[50%] text-right">
              {fin.finance_note}
            </p>
          )}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Finance ({isExternal ? 'External' : 'Internal'})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field
              label="Total User Amount"
              value={form.total_user_amount}
              onChange={(v) => setForm({ ...form, total_user_amount: v })}
            />
            {isExternal ? (
              <>
                <Field
                  label="Sell Price (Harga Jual) — fallback if no Total User"
                  value={form.sell_price}
                  onChange={(v) => setForm({ ...form, sell_price: v })}
                />
                <Field
                  label="RTR"
                  value={form.rtr_amount}
                  onChange={(v) => setForm({ ...form, rtr_amount: v })}
                />
              </>
            ) : (
              <>
                <Field
                  label="Total Ops Cost"
                  value={form.total_ops_cost}
                  onChange={(v) => setForm({ ...form, total_ops_cost: v })}
                />
                <Field
                  label="Driver Cost (optional)"
                  value={form.total_driver_amount}
                  onChange={(v) =>
                    setForm({ ...form, total_driver_amount: v })
                  }
                />
              </>
            )}
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Textarea
                rows={2}
                value={form.finance_note}
                onChange={(e) =>
                  setForm({ ...form, finance_note: e.target.value })
                }
              />
            </div>

            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Margin preview ({isExternal ? 'User − RTR' : 'User − Ops'})
              </span>
              <span
                className={`text-sm font-semibold ${previewMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {formatCurrency(previewMargin)}
              </span>
            </div>

            <Button
              className="w-full"
              onClick={save}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Saving…' : 'Save & Recompute Margin'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-900">
        {value == null || value === '' ? '-' : formatCurrency(value)}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        inputMode="numeric"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
