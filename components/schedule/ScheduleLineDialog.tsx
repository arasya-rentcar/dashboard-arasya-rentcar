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
import { useDriverFeePresets } from '@/hooks/useTripCosts';
import { dayLockReason, formatCurrency, formatDate, getErrorMessage, isoToWibDate } from '@/lib/utils';
import { ScheduleLine } from '@/types';
import { Plus, Loader2, Lock } from 'lucide-react';

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
  const tc = useTranslations('common');
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
  const [rtr, setRtr] = useState('');
  // Driver pay for this day (internal): fee, how it was built, uang jalan.
  const [fee, setFee] = useState('');
  const [feeNote, setFeeNote] = useState('');
  const [advance, setAdvance] = useState('');
  const { data: presets } = useDriverFeePresets();
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
  // WIB calendar day (service_date is WIB midnight, i.e. 17:00Z the day before).
  const lineDate = line?.service_date ? isoToWibDate(line.service_date) : undefined;
  const { driverBusy, carBusy } = useBusyUnits(lineDate, line?.id);

  useEffect(() => {
    if (!line) return;
    setIsExternal(line.is_external);
    setDriverId(line.driver?.id || '');
    setCarId(line.car?.id || '');
    setVendorId(line.external_vendor?.id || '');
    setVendorCarId(line.external_car?.id || '');
    setStatus(line.line_status);
    setRtr(num(line.rtr_amount));
    setFee(num(line.driver_fee));
    setFeeNote(line.driver_fee_note || '');
    setAdvance(num(line.travel_advance));
    setPartnerDriver(line.driver_name_raw || '');
    setPartnerPhone(line.driver_phone_raw || '');
    setPartnerPlate(line.plate_raw || line.external_car?.plate_number || '');
  }, [line]);

  if (!line) return null;

  // Internal drivers only after a paid DP (API rejects it otherwise). The
  // current driver stays shown so other fields can still be edited.
  const awaitingDp = line.order?.payment_status === 'UNPAID';
  // Finished / cancelled orders keep their days as they are (API answers 409).
  const lockReason = dayLockReason(line.order?.order_status);

  // Rupiah amounts: digits only ("250.000", "Rp 250,000" → 250000); no
  // digits → empty.
  const toNum = (s: string) => {
    const digits = s.replace(/[^\d]/g, '');
    return digits === '' ? null : Number(digits);
  };

  const revenue = Number(line.total_price ?? 0);
  // Arasya's share of the approved trip costs and the payable extras (bonus,
  // potongan) also come off the day's margin; both are read-only here.
  const arasyaCosts = Number(line.ops_cost ?? 0);
  const extras = Number(line.payable?.extras_amount ?? 0);
  // A day already paid out keeps its amounts (API answers 409 otherwise).
  const payLocked = line.payable?.status === 'PAID';
  const orig = (v?: string | number | null) => (v == null || v === '' ? null : Number(v));
  // The fee table's day fee for this line's duration (as the API picks it).
  const tablePreset =
    presets?.base.find((p) => p.key === (line.service_kind ?? '').toUpperCase()) ??
    presets?.base.find((p) => p.key === '12H');
  // Empty fee = "from the fee table": on a new assignment nothing is sent
  // (the API fills it); on a day that had a fee the table amount is sent.
  // (Without the table loaded, a cleared fee keeps the current one.)
  const feeToSend =
    toNum(fee) ??
    (orig(line.driver_fee) != null ? (tablePreset?.amount ?? orig(line.driver_fee)) : null);
  const previewMargin =
    revenue -
    (isExternal ? Number(toNum(rtr) ?? 0) : Number(feeToSend ?? tablePreset?.amount ?? 0)) -
    arasyaCosts -
    extras;
  // Only what changed is sent.
  const payFields = isExternal
    ? {}
    : {
        ...(feeToSend !== orig(line.driver_fee) ? { driver_fee: feeToSend } : {}),
        ...((feeNote.trim() || null) !== (line.driver_fee_note || null)
          ? { driver_fee_note: feeNote.trim() || null }
          : {}),
        ...(toNum(advance) !== orig(line.travel_advance)
          ? { travel_advance: toNum(advance) }
          : {}),
      };
  const fmtK = (n: number) => (n >= 1000 ? t('thousandShort', { n: n / 1000 }) : String(n));
  // An add-on on an empty fee starts from the table's day fee, not from 0.
  const addToFee = (amount: number, label: string) => {
    const base = toNum(fee) ?? tablePreset?.amount ?? 0;
    setFee(String(base + amount));
    setFeeNote((n) => {
      const start = n.trim() || (toNum(fee) == null ? tablePreset?.label ?? '' : '');
      return start ? `${start} + ${label}` : label;
    });
  };

  async function save() {
    try {
      await mutation.mutateAsync({
        id: line!.id,
        data: {
          is_external: isExternal,
          line_status: status,
          ...payFields,
          ...(isExternal ? { rtr_amount: toNum(rtr) } : {}),
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
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>
            {t('editDay')} · {line.service_date ? formatDate(line.service_date) : '—'}
          </DialogTitle>
        </DialogHeader>
        <fieldset disabled={!!lockReason} className="m-0 min-w-0 space-y-3 border-0 p-0">
          {lockReason && (
            <p className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {tc(lockReason)}
            </p>
          )}
          <p className="text-xs text-gray-500">
            {line.order?.customer_name}
            {line.order?.order_code ? ` · ${line.order.order_code}` : ''} ·{' '}
            {line.pickup_location}
            {line.dropoff_location !== line.pickup_location
              ? ` → ${line.dropoff_location}`
              : ''}
          </p>

          {/* Internal / External toggle */}
          <div className="flex gap-2" role="group" aria-label={t('driver')}>
            <button
              type="button"
              aria-pressed={!isExternal}
              onClick={() => setIsExternal(false)}
              className={`min-h-9 flex-1 rounded-lg px-3 py-1.5 text-sm font-medium border ${
                !isExternal
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {t('internal')}
            </button>
            <button
              type="button"
              aria-pressed={isExternal}
              onClick={() => setIsExternal(true)}
              className={`min-h-9 flex-1 rounded-lg px-3 py-1.5 text-sm font-medium border ${
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
                <Label htmlFor="line-driver">{t('driver')}</Label>
                <Select
                  value={driverId}
                  onValueChange={setDriverId}
                  disabled={awaitingDp}
                >
                  <SelectTrigger id="line-driver" className="w-full">
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
                <Label htmlFor="line-car">{t('car')}</Label>
                <Select value={carId} onValueChange={setCarId}>
                  <SelectTrigger id="line-car" className="w-full">
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
                <Label htmlFor="line-driver-fee">{t('driverFeeDay')}</Label>
                <Input
                  id="line-driver-fee"
                  inputMode="numeric"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder={t('driverFeeAuto')}
                  disabled={payLocked}
                />
                {!payLocked && presets && (
                  <div className="flex flex-wrap gap-1">
                    {presets.base.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => {
                          setFee(String(p.amount));
                          setFeeNote(p.label);
                        }}
                        className="min-h-7 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
                      >
                        {p.label} · {fmtK(p.amount)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        addToFee(
                          presets.addons.overnight.amount,
                          `${presets.addons.overnight.label} 1 ${presets.addons.overnight.unit}`,
                        )
                      }
                      className="min-h-7 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700 hover:bg-blue-100"
                    >
                      + {presets.addons.overnight.label} {fmtK(presets.addons.overnight.amount)}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        addToFee(
                          presets.addons.overtime.amount,
                          `${presets.addons.overtime.label} 1 ${presets.addons.overtime.unit}`,
                        )
                      }
                      className="min-h-7 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700 hover:bg-blue-100"
                    >
                      + {presets.addons.overtime.label} 1 {presets.addons.overtime.unit} {fmtK(presets.addons.overtime.amount)}
                    </button>
                  </div>
                )}
                <Input
                  value={feeNote}
                  onChange={(e) => setFeeNote(e.target.value)}
                  placeholder={t('driverFeeNote')}
                  aria-label={t('driverFeeNote')}
                  disabled={payLocked}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="line-travel-advance">{t('travelAdvance')}</Label>
                <Input
                  id="line-travel-advance"
                  inputMode="numeric"
                  value={advance}
                  onChange={(e) => setAdvance(e.target.value)}
                  placeholder="0"
                  disabled={payLocked}
                />
                <p className="text-[11px] text-gray-500">{t('travelAdvanceHint')}</p>
              </div>
              {payLocked && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {t('payLockedNote')}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{t('vendor')}</Label>
                  <button
                    type="button"
                    onClick={() => setNewVendorOpen((o) => !o)}
                    className="inline-flex min-h-7 items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700"
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
                    <SelectTrigger className="w-full" aria-label={t('vendor')}>
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
                      className="inline-flex min-h-7 items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700"
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
                      <SelectTrigger className="w-full" aria-label={t('vendorCar')}>
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
                <Label htmlFor="line-rtr">{t('rtrDay')}</Label>
                <Input
                  id="line-rtr"
                  inputMode="numeric"
                  value={rtr}
                  onChange={(e) => setRtr(e.target.value)}
                  placeholder="0"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="line-status">{t('status')}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="line-status" className="w-full">
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

          <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 flex items-center justify-between gap-3">
            <span className="min-w-0 text-xs text-gray-500">
              {t('marginPreview')} ({isExternal ? t('revenueMinusRtr') : t('revenueMinusFee')})
              {arasyaCosts + extras !== 0 && (
                <span className="block text-[11px] text-gray-400">
                  {t('marginCostsNote', { costs: formatCurrency(arasyaCosts + extras) })}
                </span>
              )}
            </span>
            <span
              className={`shrink-0 text-sm font-semibold tabular-nums ${previewMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
            >
              {formatCurrency(previewMargin)}
            </span>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={save}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mutation.isPending ? t('saving') : t('saveRecompute')}
          </Button>
        </fieldset>
      </DialogContent>
    </Dialog>
  );
}
