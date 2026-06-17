'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDrivers } from '@/hooks/useDrivers';
import { useCars } from '@/hooks/useCars';
import { useExternalVendors, useExternalVendor } from '@/hooks/useExternalVendors';
import { useAssignScheduleLine } from '@/hooks/useSchedule';
import { formatCurrency, getErrorMessage } from '@/lib/utils';
import { ScheduleLine } from '@/types';

const num = (v?: string | number | null) =>
  v == null || v === '' ? '' : String(v);

export default function ScheduleLineDialog({
  line,
  open,
  onClose,
}: {
  line: ScheduleLine | null;
  open: boolean;
  onClose: () => void;
}) {
  const mutation = useAssignScheduleLine();
  const { data: drivers } = useDrivers();
  const { data: cars } = useCars();
  const { data: vendorList } = useExternalVendors({ page: 1, page_size: 100 });

  const [isExternal, setIsExternal] = useState(false);
  const [driverId, setDriverId] = useState('');
  const [carId, setCarId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [vendorCarId, setVendorCarId] = useState('');
  const [status, setStatus] = useState('SCHEDULED');
  const [ops, setOps] = useState('');
  const [rtr, setRtr] = useState('');

  const { data: vendorDetail } = useExternalVendor(
    vendorId || '',
    { cars_page: 1 },
  );

  useEffect(() => {
    if (!line) return;
    setIsExternal(line.is_external);
    setDriverId(line.driver?.id || '');
    setCarId(line.car?.id || '');
    setVendorId(line.external_vendor?.id || '');
    setVendorCarId(line.external_car?.id || '');
    setStatus(line.line_status);
    setOps(num(line.ops_cost));
    setRtr(num(line.rtr_amount));
  }, [line]);

  if (!line) return null;

  const toNum = (s: string) =>
    s.trim() === '' ? null : Number(s.replace(/[^\d.-]/g, ''));

  const revenue = Number(line.total_price ?? 0);
  const previewMargin = isExternal
    ? revenue - Number(toNum(rtr) ?? 0)
    : revenue - Number(toNum(ops) ?? 0);

  async function save() {
    try {
      await mutation.mutateAsync({
        id: line!.id,
        data: {
          is_external: isExternal,
          line_status: status,
          ops_cost: toNum(ops) ?? 0,
          rtr_amount: isExternal ? toNum(rtr) : null,
          driver_id: isExternal ? null : driverId || null,
          car_id: isExternal ? null : carId || null,
          external_vendor_id: isExternal ? vendorId || null : null,
          external_car_id: isExternal ? vendorCarId || null : null,
        },
      });
      toast.success('Schedule line updated — margin recomputed');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const vendorCars = vendorDetail?.cars ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Edit Day · {line.service_date?.slice(0, 10) || '—'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            {line.order?.customer_name}
            {line.order?.order_code ? ` · ${line.order.order_code}` : ''} ·{' '}
            {line.pickup_location}
            {line.dropoff_location !== line.pickup_location
              ? ` → ${line.dropoff_location}`
              : ''}
          </p>

          {/* Internal / External toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsExternal(false)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium border ${
                !isExternal
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              Internal
            </button>
            <button
              type="button"
              onClick={() => setIsExternal(true)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium border ${
                isExternal
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              External
            </button>
          </div>

          {!isExternal ? (
            <>
              <div className="space-y-1.5">
                <Label>Driver</Label>
                <Select value={driverId} onValueChange={setDriverId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {(drivers ?? [])
                      .filter((d) => d.type === 'INTERNAL')
                      .map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Car</Label>
                <Select value={carId} onValueChange={setCarId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select car" />
                  </SelectTrigger>
                  <SelectContent>
                    {(cars ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.model} · {c.plate_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ops Cost (this day)</Label>
                <Input
                  inputMode="numeric"
                  value={ops}
                  onChange={(e) => setOps(e.target.value)}
                  placeholder="0"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Vendor</Label>
                <Select
                  value={vendorId}
                  onValueChange={(v) => {
                    setVendorId(v);
                    setVendorCarId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(vendorList?.data ?? []).map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {vendorId && (
                <div className="space-y-1.5">
                  <Label>Vendor Car</Label>
                  <Select value={vendorCarId} onValueChange={setVendorCarId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select car" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendorCars.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.model}
                          {c.plate_number ? ` · ${c.plate_number}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>RTR (vendor cost, this day)</Label>
                <Input
                  inputMode="numeric"
                  value={rtr}
                  onChange={(e) => setRtr(e.target.value)}
                  placeholder="0"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Margin preview ({isExternal ? 'Revenue − RTR' : 'Revenue − Ops'})
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
            {mutation.isPending ? 'Saving…' : 'Save & Recompute'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
