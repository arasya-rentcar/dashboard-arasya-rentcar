'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useAvailableDrivers } from '@/hooks/useDrivers';
import { useAvailableCars } from '@/hooks/useCars';

const schema = z.object({
  driver_id: z.string().uuid('Select a driver'),
  car_id: z.string().uuid('Select a car'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (data: { driver_id: string; car_id: string }) => Promise<void>;
  isLoading: boolean;
}

export default function AssignDriverForm({ onSubmit, isLoading }: Props) {
  const { data: drivers, isLoading: driversLoading } = useAvailableDrivers();
  const { data: cars, isLoading: carsLoading } = useAvailableCars();

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Driver</Label>
        <Controller
          control={control}
          name="driver_id"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder={driversLoading ? 'Loading...' : 'Select driver'} />
              </SelectTrigger>
              <SelectContent>
                {drivers?.length === 0 && (
                  <SelectItem value="none" disabled>
                    No available drivers
                  </SelectItem>
                )}
                {drivers?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} — {d.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.driver_id && (
          <p className="text-xs text-red-500">{errors.driver_id.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Car</Label>
        <Controller
          control={control}
          name="car_id"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder={carsLoading ? 'Loading...' : 'Select car'} />
              </SelectTrigger>
              <SelectContent>
                {cars?.length === 0 && (
                  <SelectItem value="none" disabled>
                    No available cars
                  </SelectItem>
                )}
                {cars?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.model} — {c.plate_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.car_id && (
          <p className="text-xs text-red-500">{errors.car_id.message}</p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isLoading || driversLoading || carsLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Assign Driver
        </Button>
      </div>
    </form>
  );
}
