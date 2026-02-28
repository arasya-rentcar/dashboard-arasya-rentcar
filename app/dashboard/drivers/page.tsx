'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useDrivers, useCreateDriver } from '@/hooks/useDrivers';
import { useUsers } from '@/hooks/useUsers';
import { DriverStatus } from '@/types';
import { getErrorMessage } from '@/lib/utils';

const DRIVER_STATUS_STYLES: Record<DriverStatus, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ON_DUTY: 'bg-amber-50 text-amber-700 border-amber-200',
  OFF: 'bg-gray-100 text-gray-500 border-gray-200',
};

const createDriverSchema = z.object({
  user_id: z.string().uuid('Select a user'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
});
type CreateDriverForm = z.infer<typeof createDriverSchema>;

export default function DriversPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: drivers, isLoading } = useDrivers();
  const { data: users } = useUsers();
  const createMutation = useCreateDriver();

  const filtered = drivers?.filter((d) =>
    search === '' ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.includes(search)
  );

  const driverUserIds = new Set(drivers?.map((d) => d.user_id));
  const availableUsers = users?.filter(
    (u) => u.role === 'DRIVER' && !driverUserIds.has(u.id)
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateDriverForm>({ resolver: zodResolver(createDriverSchema) });

  async function onSubmit(data: CreateDriverForm) {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Driver created successfully');
      setCreateOpen(false);
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <DashboardShell title="Drivers">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search drivers…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Driver
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Email</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(4)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-gray-400 text-sm">
                    No drivers found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered?.map((driver) => (
                  <TableRow key={driver.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-medium text-sm text-gray-900">
                      {driver.name}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{driver.phone}</TableCell>
                    <TableCell className="text-sm text-gray-500 hidden md:table-cell">
                      {driver.user?.email ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${DRIVER_STATUS_STYLES[driver.status]}`}
                      >
                        {driver.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Driver Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Driver</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>User Account</Label>
              <Controller
                control={control}
                name="user_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user (DRIVER role)" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers?.length === 0 && (
                        <SelectItem value="none" disabled>
                          No available driver accounts
                        </SelectItem>
                      )}
                      {availableUsers?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.user_id && (
                <p className="text-xs text-red-500">{errors.user_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="d_name">Name</Label>
              <Input id="d_name" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="d_phone">Phone</Label>
              <Input id="d_phone" {...register('phone')} />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Driver
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
