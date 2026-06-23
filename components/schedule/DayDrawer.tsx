'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Users,
  Car as CarIcon,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useSchedule,
  useScheduleStock,
  useBusyUnits,
  useAssignScheduleLine,
} from '@/hooks/useSchedule';
import { useDrivers } from '@/hooks/useDrivers';
import { useCars } from '@/hooks/useCars';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { ScheduleLine } from '@/types';

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

export default function DayDrawer({
  date,
  onClose,
}: {
  date: string | null;
  onClose: () => void;
}) {
  const t = useTranslations('dayDrawer');
  const open = !!date;

  // Day's lines (internal + external) for the picked WIB date.
  const { data, isLoading } = useSchedule({
    date_from: date || undefined,
    date_to: date || undefined,
    page: 1,
    page_size: 100,
  });
  const { data: stock } = useScheduleStock(date || undefined);

  const lines = data?.items ?? [];
  const internal = lines.filter((l) => !l.is_external);
  const freeDrivers = stock?.drivers.free ?? 0;
  const freeCars = stock?.cars.free ?? 0;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>
            {date ? `${t('title')} · ${formatDate(date)}` : t('title')}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <p className="py-10 text-center text-sm text-gray-400">
            {t('loading')}
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {/* Capacity summary */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <Users className="h-4 w-4" />
                  <span className="text-lg font-semibold">{freeDrivers}</span>
                </div>
                <p className="text-[11px] text-gray-500">{t('freeDrivers')}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CarIcon className="h-4 w-4" />
                  <span className="text-lg font-semibold">{freeCars}</span>
                </div>
                <p className="text-[11px] text-gray-500">{t('freeCars')}</p>
              </div>
            </div>

            {/* Trips that day */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t('trips')} ({internal.length})
              </h4>
              {internal.length === 0 ? (
                <p className="text-sm text-gray-400">{t('noTrips')}</p>
              ) : (
                <ul className="space-y-2">
                  {internal.map((line) => (
                    <LineCard key={line.id} line={line} date={date!} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function LineCard({ line, date }: { line: ScheduleLine; date: string }) {
  const t = useTranslations('dayDrawer');
  const assigned = !!line.driver?.id;
  const started =
    line.line_status === 'IN_PROGRESS' || line.line_status === 'DONE';
  const cancelled = line.line_status === 'CANCELLED';
  const [editing, setEditing] = useState(false);

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/dashboard/orders/${line.order?.id}`}
            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
          >
            {line.order?.order_code || line.order?.customer_name || '—'}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
          <p className="truncate text-xs text-gray-500">
            {line.pickup_location} → {line.dropoff_location}
          </p>
        </div>
        <Badge
          variant="outline"
          className={`shrink-0 text-[10px] ${STATUS_STYLES[line.line_status] || ''}`}
        >
          {line.line_status}
        </Badge>
      </div>

      {/* Assignment row */}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        {assigned ? (
          <span className="text-gray-600">
            <Users className="mr-1 inline h-3 w-3 text-gray-400" />
            {line.driver?.name}
            {line.car?.model ? ` · ${line.car.model}` : ''}
          </span>
        ) : (
          <span className="text-amber-600">{t('unassigned')}</span>
        )}

        {!cancelled && !started && !editing && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setEditing(true)}
          >
            {assigned ? t('reassign') : t('assign')}
          </Button>
        )}
      </div>

      {editing && (
        <AssignInline
          line={line}
          date={date}
          onDone={() => setEditing(false)}
        />
      )}
    </li>
  );
}

function AssignInline({
  line,
  date,
  onDone,
}: {
  line: ScheduleLine;
  date: string;
  onDone: () => void;
}) {
  const t = useTranslations('dayDrawer');
  const { data: drivers } = useDrivers();
  const { data: cars } = useCars();
  const { driverBusy, carBusy } = useBusyUnits(date, line.id);
  const mutation = useAssignScheduleLine();

  const [driverId, setDriverId] = useState(line.driver?.id || '');
  const [carId, setCarId] = useState(line.car?.id || '');

  async function save() {
    try {
      await mutation.mutateAsync({
        id: line.id,
        data: {
          is_external: false,
          line_status: line.line_status,
          ops_cost: Number(line.ops_cost) || 0,
          driver_id: driverId || null,
          car_id: carId || null,
        },
      });
      toast.success(t('assignSuccess'));
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-md bg-gray-50 p-2">
      <div className="space-y-1.5">
        <label className="text-[11px] text-gray-400">{t('driver')}</label>
        <Select value={driverId} onValueChange={setDriverId}>
          <SelectTrigger className="h-8 text-xs">
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
        <label className="text-[11px] text-gray-400">{t('car')}</label>
        <Select value={carId} onValueChange={setCarId}>
          <SelectTrigger className="h-8 text-xs">
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
      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onDone}
          disabled={mutation.isPending}
        >
          {t('cancel')}
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={save}
          disabled={mutation.isPending || !driverId}
        >
          {mutation.isPending ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-1 h-3 w-3" />
          )}
          {t('save')}
        </Button>
      </div>
    </div>
  );
}
