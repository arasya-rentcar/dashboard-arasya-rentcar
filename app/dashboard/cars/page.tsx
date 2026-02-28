'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DashboardShell from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCars, useCreateCar } from '@/hooks/useCars';
import { CarStatus } from '@/types';
import { getErrorMessage } from '@/lib/utils';

const CAR_STATUS_STYLES: Record<CarStatus, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  IN_USE: 'bg-amber-50 text-amber-700 border-amber-200',
  MAINTENANCE: 'bg-red-50 text-red-700 border-red-200',
};

const createCarSchema = z.object({
  plate_number: z.string().min(1, 'Plate number is required'),
  model: z.string().min(1, 'Model is required'),
});
type CreateCarForm = z.infer<typeof createCarSchema>;

export default function CarsPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: cars, isLoading } = useCars();
  const createMutation = useCreateCar();

  const filtered = cars?.filter((c) =>
    search === '' ||
    c.model.toLowerCase().includes(search.toLowerCase()) ||
    c.plate_number.toLowerCase().includes(search.toLowerCase())
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCarForm>({ resolver: zodResolver(createCarSchema) });

  async function onSubmit(data: CreateCarForm) {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Car added successfully');
      setCreateOpen(false);
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <DashboardShell title="Cars">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search cars…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Car
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Model</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Plate Number</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(3)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-gray-400 text-sm">
                    No cars found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered?.map((car) => (
                  <TableRow key={car.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-medium text-sm text-gray-900">
                      {car.model}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-600">
                      {car.plate_number}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${CAR_STATUS_STYLES[car.status]}`}
                      >
                        {car.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Car Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Car</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <Input id="model" placeholder="e.g. Toyota Avanza" {...register('model')} />
              {errors.model && <p className="text-xs text-red-500">{errors.model.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plate_number">Plate Number</Label>
              <Input id="plate_number" placeholder="e.g. B 1234 XYZ" {...register('plate_number')} />
              {errors.plate_number && (
                <p className="text-xs text-red-500">{errors.plate_number.message}</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Car
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
