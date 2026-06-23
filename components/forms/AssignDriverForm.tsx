'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useBusyUnitsMulti } from '@/hooks/useSchedule';

const schema = z.object({
  driver_id: z.string().uuid('errSelectDriver'),
  car_id: z.string().uuid('errSelectCar'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (data: { driver_id: string; car_id: string }) => Promise<void>;
  isLoading: boolean;
  // Service dates (YYYY-MM-DD) of the lines being assigned. A driver/car busy
  // on ANY of these dates is shown but DISABLED (show-but-disable).
  serviceDates?: string[];
}

export default function AssignDriverForm({
  onSubmit,
  isLoading,
  serviceDates = [],
}: Props) {
  const t = useTranslations('assignDriver');
  const tc = useTranslations('common');
  // Show ALL internal drivers/cars (not just free ones) so busy units appear
  // greyed-out instead of vanishing.
  const { data: allDrivers, isLoading: driversLoading } = useDrivers();
  const { data: cars, isLoading: carsLoading } = useCars();
  const drivers = (allDrivers ?? []).filter((d) => d.type === 'INTERNAL');
  const { driverBusy, carBusy } = useBusyUnitsMulti(serviceDates);

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t('driver')}</Label>
        <Controller
          control={control}
          name="driver_id"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder={driversLoading ? tc('loading') : t('selectDriver')} />
              </SelectTrigger>
              <SelectContent>
                {drivers?.length === 0 && (
                  <SelectItem value="none" disabled>
                    {t('noDrivers')}
                  </SelectItem>
                )}
                {drivers?.map((d) => {
                  const busy = driverBusy.has(d.id);
                  return (
                    <SelectItem key={d.id} value={d.id} disabled={busy}>
                      {d.name} — {d.phone}
                      {busy ? ` · ${t('onTrip')}` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        />
        {errors.driver_id && (
          <p className="text-xs text-red-500">{t(errors.driver_id.message ?? 'errSelectDriver')}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>{t('car')}</Label>
        <Controller
          control={control}
          name="car_id"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder={carsLoading ? tc('loading') : t('selectCar')} />
              </SelectTrigger>
              <SelectContent>
                {cars?.length === 0 && (
                  <SelectItem value="none" disabled>
                    {t('noCars')}
                  </SelectItem>
                )}
                {cars?.map((c) => {
                  const busy = carBusy.has(c.id);
                  return (
                    <SelectItem key={c.id} value={c.id} disabled={busy}>
                      {c.model} — {c.plate_number}
                      {busy ? ` · ${t('onTrip')}` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        />
        {errors.car_id && (
          <p className="text-xs text-red-500">{t(errors.car_id.message ?? 'errSelectCar')}</p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isLoading || driversLoading || carsLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('assignBtn')}
        </Button>
      </div>
    </form>
  );
}
