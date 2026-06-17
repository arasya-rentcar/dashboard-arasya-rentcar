"use client";

import { useState } from "react";
import { Edit, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useDrivers,
  useCreateDriver,
  useUpdateDriver,
} from "@/hooks/useDrivers";
import { useUsers } from "@/hooks/useUsers";
import TablePagination, { usePagination } from "@/components/dashboard/TablePagination";
import { Driver, DriverStatus } from "@/types";
import { getErrorMessage } from "@/lib/utils";

const DRIVER_STATUS_STYLES: Record<DriverStatus, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ON_DUTY: "bg-amber-50 text-amber-700 border-amber-200",
  OFF: "bg-gray-100 text-gray-500 border-gray-200",
};

const createDriverSchema = z.object({
  user_id: z.string().uuid("Select a user"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  type: z.enum(["INTERNAL", "EXTERNAL"]),
  location: z.string().optional(),
});
type CreateDriverForm = z.infer<typeof createDriverSchema>;

const editDriverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  type: z.enum(["INTERNAL", "EXTERNAL"]),
  location: z.string().optional(),
  status: z.enum(["AVAILABLE", "ON_DUTY", "OFF"]),
});
type EditDriverForm = z.infer<typeof editDriverSchema>;

export default function DriversPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const { data: drivers, isLoading } = useDrivers();
  const { data: users } = useUsers();
  const createMutation = useCreateDriver();
  const updateMutation = useUpdateDriver();

  const filtered = drivers?.filter((d) => {
    const matchSearch =
      search === "" ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search) ||
      d.location?.toLowerCase().includes(search.toLowerCase()) ||
      d.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const PAGE_SIZE = 10;
  const { page, setPage, pageCount, total, start, pageItems } = usePagination(
    filtered ?? [],
    PAGE_SIZE,
  );

  const driverUserIds = new Set(drivers?.map((d) => d.user_id));
  const availableUsers = users?.filter(
    (u) => u.role === "DRIVER" && !driverUserIds.has(u.id),
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateDriverForm>({
    resolver: zodResolver(createDriverSchema),
    defaultValues: { type: "INTERNAL" },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    control: editControl,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditDriverForm>({ resolver: zodResolver(editDriverSchema) });

  async function onSubmit(data: CreateDriverForm) {
    try {
      await createMutation.mutateAsync(data);
      toast.success("Driver created successfully");
      setCreateOpen(false);
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function openEdit(driver: Driver) {
    setEditingDriver(driver);
    resetEdit({
      name: driver.name,
      phone: driver.phone,
      type: driver.type,
      location: driver.location || "",
      status: driver.status,
    });
  }

  async function onEditSubmit(data: EditDriverForm) {
    if (!editingDriver) return;
    try {
      await updateMutation.mutateAsync({ id: editingDriver.id, data });
      toast.success("Driver updated successfully");
      setEditingDriver(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <DashboardShell title="Drivers">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search drivers…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="ON_DUTY">On Duty</SelectItem>
                <SelectItem value="OFF">Off</SelectItem>
              </SelectContent>
            </Select>
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
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide w-12">
                  No
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Name
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Phone
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Email
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Type
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                  Asal / Base
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-10 text-gray-400 text-sm"
                  >
                    No drivers found.
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((driver, idx) => (
                  <TableRow key={driver.id} className="hover:bg-gray-50/50">
                    <TableCell className="text-sm text-gray-400 tabular-nums">
                      {start + idx + 1}
                    </TableCell>
                    <TableCell className="font-medium text-sm text-gray-900">
                      {driver.name}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {driver.phone}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 hidden md:table-cell">
                      {driver.user?.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          driver.type === "INTERNAL"
                            ? "text-xs bg-blue-50 text-blue-700 border-blue-200"
                            : "text-xs bg-purple-50 text-purple-700 border-purple-200"
                        }
                      >
                        {driver.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 hidden lg:table-cell">
                      {driver.location || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${DRIVER_STATUS_STYLES[driver.status]}`}
                      >
                        {driver.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(driver)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          page={page}
          pageCount={pageCount}
          total={total}
          start={start}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="drivers"
        />
      </div>

      {/* Create Driver Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
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
              <Input id="d_name" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="d_phone">Phone</Label>
                <Input id="d_phone" {...register("phone")} />
                {errors.phone && (
                  <p className="text-xs text-red-500">{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Internal / External" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INTERNAL">
                          Internal Arasya
                        </SelectItem>
                        <SelectItem value="EXTERNAL">
                          External / Freelance
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="d_location">Asal / Base Location</Label>
              <Input
                id="d_location"
                placeholder="e.g. Arasya pool, Depok, Bandung"
                {...register("location")}
              />
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

      {/* Edit Driver Dialog */}
      <Dialog
        open={!!editingDriver}
        onOpenChange={(open) => !open && setEditingDriver(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit_d_name">Name</Label>
              <Input id="edit_d_name" {...registerEdit("name")} />
              {editErrors.name && (
                <p className="text-xs text-red-500">
                  {editErrors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit_d_phone">Phone</Label>
                <Input id="edit_d_phone" {...registerEdit("phone")} />
                {editErrors.phone && (
                  <p className="text-xs text-red-500">
                    {editErrors.phone.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Controller
                  control={editControl}
                  name="type"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Internal / External" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INTERNAL">
                          Internal Arasya
                        </SelectItem>
                        <SelectItem value="EXTERNAL">
                          External / Freelance
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Controller
                  control={editControl}
                  name="status"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">Available</SelectItem>
                        <SelectItem value="ON_DUTY">On Duty</SelectItem>
                        <SelectItem value="OFF">Off</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_d_location">Asal / Base Location</Label>
                <Input
                  id="edit_d_location"
                  placeholder="e.g. Arasya pool, Depok, Bandung"
                  {...registerEdit("location")}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingDriver(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
