'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import {
  useExternalVendors,
  useExternalVendor,
  useCreateVendor,
  useAddVendorCar,
} from '@/hooks/useExternalVendors';
import { useAssignScheduleLine, useBusyUnits } from '@/hooks/useSchedule';
import { formatCurrency, getErrorMessage } from '@/lib/utils';
import { ScheduleLine } from '@/types';
import { Plus, Loader2 } from 'lucide-react';

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
  const t = useTranslations('scheduleLine');
  const mutation = useAssignScheduleLine();
  const createVendor = useCreateVendor();
  const addVendorCar = useAddVendorCar();
  const { data: drivers } = useDrivers();
  const { data: cars } = useCars();
  const { data: vendorList } = useExternalVendors({ page: 1, page_size: 100 });

  // Inline create state
  const [newVendorOpen, setNewVendorOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newCarOpen, setNewCarOpen] = useState(false);
  const [newCarModel, setNewCarModel] = useState('');
  const [newCarPlate, setNewCarPlate] = useState('');

  const [isExternal, setIsExternal] = useState(false);
  const [driverId, setDriverId] = useState('');
  const [carId, setCarId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [vendorCarId, setVendorCarId] = useState('');
  const [status, setStatus] = useState('SCHEDULED');
  const [ops, setOps] = useState('');
  const [rtr, setRtr] = useState('');
  // Partner (rekanan) driver + plate, kept on the line itself.
  const [partnerDriver, setPartnerDriver] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerPlate, setPartnerPlate] = useState('');

  const { data: vendorDetail } = useExternalVendor(
    vendorId || '',
    { cars_page: 1 },
  );

  // Availability-aware selects: a driver/car already booked on this line's
  // service_date is shown but DISABLED. The line's own current driver/car stays
  // selectable (excludeLineId).
  const lineDate = line?.service_date
    ? String(line.service_date).slice(0, 10)
    : undefined;
  const { driverBusy, carBusy } = useBusyUnits(lineDate, line?.id);

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
    setPartnerDriver(line.driver_name_raw || '');
    setPartnerPhone(line.driver_phone_raw || '');
    setPartnerPlate(line.plate_raw || line.external_car?.plate_number || '');
  }, [line]);

  if (!line) return null;

  // Internal drivers only after a paid DP (API rejects it otherwise). The
  // current driver stays shown so other fields can still be edited.
  const awaitingDp = line.order?.payment_status === 'UNPAID';

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
          ...(isExternal
            ? {
                driver_name_raw: partnerDriver.trim() || null,
                driver_phone_raw: partnerPhone.trim() || null,
                plate_raw: partnerPlate.trim() || null,
              }
            : {}),
        },
      });
      toast.success(t('savedToast'));
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleCreateVendor() {
    const name = newVendorName.trim();
    if (!name) {
      toast.error(t('errVendorNameRequired'));
      return;
    }
    try {
      const res = await createVendor.mutateAsync({
        name,
        phone: newVendorPhone.trim() || undefined,
      });
      const created = res?.data?.data;
      if (created?.id) {
        setVendorId(created.id);
        setVendorCarId('');
      }
      toast.success(t('vendorCreated'));
      setNewVendorOpen(false);
      setNewVendorName('');
      setNewVendorPhone('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleCreateVendorCar() {
    if (!vendorId) {
      toast.error(t('errSelectVendorFirst'));
      return;
    }
    const model = newCarModel.trim();
    if (!model) {
      toast.error(t('errCarModelRequired'));
      return;
    }
    try {
      const res = await addVendorCar.mutateAsync({
        id: vendorId,
        data: {
          model,
          plate_number: newCarPlate.trim() || undefined,
        },
      });
      const created = res?.data?.data;
      if (created?.id) setVendorCarId(created.id);
      if (!partnerPlate.trim() && newCarPlate.trim())
        setPartnerPlate(newCarPlate.trim());
      toast.success(t('vendorCarAdded'));
      setNewCarOpen(false);
      setNewCarModel('');
      setNewCarPlate('');
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
            {t('editDay')} · {line.service_date?.slice(0, 10) || '—'}
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
              {t('internal')}
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
              {t('external')}
            </button>
          </div>

          {!isExternal ? (
            <>
              {awaitingDp ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {t('awaitingDpNote')}
                </p>
              ) : line.order?.start_ready === false ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {t('notPaidNote')}
                </p>
              ) : null}
              <div className="space-y-1.5">
                <Label>{t('driver')}</Label>
                <Select
                  value={driverId}
                  onValueChange={setDriverId}
                  disabled={awaitingDp}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectDriver')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(drivers ?? [])
                      .filter((d) => d.type === 'INTERNAL')
                      .map((d) => {
                        const busy = driverBusy.has(d.id) && d.id !== driverId;
                        return (
                          <SelectItem key={d.id} value={d.id} disabled={busy}>
                            {d.name}
                            {busy ? ` · ${t('onTrip')}` : ''}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('car')}</Label>
                <Select value={carId} onValueChange={setCarId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectCar')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(cars ?? []).map((c) => {
                      const busy = carBusy.has(c.id) && c.id !== carId;
                      return (
                        <SelectItem key={c.id} value={c.id} disabled={busy}>
                          {c.model} · {c.plate_number}
                          {busy ? ` · ${t('onTrip')}` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('opsCostDay')}</Label>
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
                <div className="flex items-center justify-between">
                  <Label>{t('vendor')}</Label>
                  <button
                    type="button"
                    onClick={() => setNewVendorOpen((o) => !o)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700"
                  >
                    <Plus className="h-3 w-3" />
                    {newVendorOpen ? t('cancel') : t('newVendor')}
                  </button>
                </div>
                {newVendorOpen ? (
                  <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-2.5 space-y-2">
                    <Input
                      placeholder={t('vendorNamePlaceholder')}
                      value={newVendorName}
                      onChange={(e) => setNewVendorName(e.target.value)}
                    />
                    <Input
                      placeholder={t('phoneOptional')}
                      value={newVendorPhone}
                      onChange={(e) => setNewVendorPhone(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      onClick={handleCreateVendor}
                      disabled={createVendor.isPending}
                    >
                      {createVendor.isPending && (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      )}
                      {t('createVendor')}
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={vendorId}
                    onValueChange={(v) => {
                      setVendorId(v);
                      setVendorCarId('');
                      setNewCarOpen(false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectVendor')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(vendorList?.data ?? []).map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {vendorId && !newVendorOpen && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>{t('vendorCar')}</Label>
                    <button
                      type="button"
                      onClick={() => setNewCarOpen((o) => !o)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700"
                    >
                      <Plus className="h-3 w-3" />
                      {newCarOpen ? t('cancel') : t('newCar')}
                    </button>
                  </div>
                  {newCarOpen ? (
                    <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-2.5 space-y-2">
                      <Input
                        placeholder={t('carModelPlaceholder')}
                        value={newCarModel}
                        onChange={(e) => setNewCarModel(e.target.value)}
                      />
                      <Input
                        placeholder={t('platePlaceholder')}
                        value={newCarPlate}
                        onChange={(e) => setNewCarPlate(e.target.value)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        onClick={handleCreateVendorCar}
                        disabled={addVendorCar.isPending}
                      >
                        {addVendorCar.isPending && (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        )}
                        {t('addCar')}
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={vendorCarId}
                      onValueChange={(v) => {
                        setVendorCarId(v);
                        // Prefill the plate from the chosen unit when still empty.
                        const plate = vendorCars.find((c) => c.id === v)?.plate_number;
                        if (!partnerPlate.trim() && plate) setPartnerPlate(plate);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectCar')} />
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
                  )}
                </div>
              )}
              <div className="rounded-lg border border-purple-100 bg-purple-50/40 p-2.5 space-y-2">
                <p className="text-xs font-medium text-purple-800">
                  {t('partnerDriverTitle')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">
                      {t('partnerDriverName')}
                    </Label>
                    <Input
                      value={partnerDriver}
                      onChange={(e) => setPartnerDriver(e.target.value)}
                      placeholder={t('partnerDriverNamePlaceholder')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">
                      {t('partnerDriverPhone')}
                    </Label>
                    <Input
                      inputMode="tel"
                      value={partnerPhone}
                      onChange={(e) => setPartnerPhone(e.target.value)}
                      placeholder="08…"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">{t('partnerPlate')}</Label>
                  <Input
                    value={partnerPlate}
                    onChange={(e) => setPartnerPlate(e.target.value)}
                    placeholder={t('platePlaceholder')}
                  />
                </div>
                <p className="text-[11px] text-gray-500">{t('partnerHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label>{t('rtrDay')}</Label>
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
            <Label>{t('status')}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SCHEDULED">{t('statusScheduled')}</SelectItem>
                <SelectItem value="ASSIGNED">{t('statusAssigned')}</SelectItem>
                <SelectItem value="IN_PROGRESS">{t('statusInProgress')}</SelectItem>
                <SelectItem value="DONE">{t('statusDone')}</SelectItem>
                <SelectItem value="CANCELLED">{t('statusCancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {t('marginPreview')} ({isExternal ? t('revenueMinusRtr') : t('revenueMinusOps')})
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
            {mutation.isPending ? t('saving') : t('saveRecompute')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
