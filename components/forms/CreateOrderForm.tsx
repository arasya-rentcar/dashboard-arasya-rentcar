'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().min(1, 'Customer phone is required'),
  pickup_location: z.string().min(1, 'Pickup location is required'),
  dropoff_location: z.string().min(1, 'Dropoff location is required'),
  order_date: z.string().min(1, 'Order date is required'),
  final_price: z
    .string()
    .min(1, 'Price is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (data: {
    customer_name: string;
    customer_phone: string;
    pickup_location: string;
    dropoff_location: string;
    order_date: string;
    final_price: number;
  }) => Promise<void>;
  isLoading: boolean;
}

export default function CreateOrderForm({ onSubmit, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function handleFormSubmit(values: FormValues) {
    await onSubmit({
      ...values,
      order_date: new Date(values.order_date).toISOString(),
      final_price: Number(values.final_price),
    });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="customer_name">Customer Name</Label>
          <Input id="customer_name" {...register('customer_name')} />
          {errors.customer_name && (
            <p className="text-xs text-red-500">{errors.customer_name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="customer_phone">Customer Phone</Label>
          <Input id="customer_phone" {...register('customer_phone')} />
          {errors.customer_phone && (
            <p className="text-xs text-red-500">{errors.customer_phone.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pickup_location">Pickup Location</Label>
        <Input id="pickup_location" {...register('pickup_location')} />
        {errors.pickup_location && (
          <p className="text-xs text-red-500">{errors.pickup_location.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dropoff_location">Dropoff Location</Label>
        <Input id="dropoff_location" {...register('dropoff_location')} />
        {errors.dropoff_location && (
          <p className="text-xs text-red-500">{errors.dropoff_location.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="order_date">Order Date</Label>
          <Input id="order_date" type="datetime-local" {...register('order_date')} />
          {errors.order_date && (
            <p className="text-xs text-red-500">{errors.order_date.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="final_price">Final Price (IDR)</Label>
          <Input id="final_price" type="number" min="0" {...register('final_price')} />
          {errors.final_price && (
            <p className="text-xs text-red-500">{errors.final_price.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Order
        </Button>
      </div>
    </form>
  );
}
