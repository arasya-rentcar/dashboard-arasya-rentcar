"use client";

import { useState } from "react";
import { Edit, Plus, Search, LayoutGrid, List } from "lucide-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DashboardShell from "@/components/layout/DashboardShell";
import CarPhotoCell from "@/components/cars/CarPhotoCell";
import CarCard from "@/components/cars/CarCard";
import PeriodToggle from "@/components/revenue/PeriodToggle";
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
import { useCars, useCreateCar, useUpdateCar } from "@/hooks/useCars";
import TablePagination, { usePagination } from "@/components/dashboard/TablePagination";
import { Car, CarStatus } from "@/types";
import { getErrorMessage } from "@/lib/utils";

const CAR_STATUS_STYLES: Record<CarStatus, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  IN_USE: "bg-amber-50 text-amber-700 border-amber-200",
  MAINTENANCE: "bg-red-50 text-red-700 border-red-200",
};

const createCarSchema = z.object({
  plate_number: z.string().min(1, "Plate number is required"),
  unit_code: z.string().optional(),
  model: z.string().min(1, "Model is required"),
  type: z.enum(["INTERNAL", "EXTERNAL"]),
  origin_location: z.string().optional(),
});
type CreateCarForm = z.infer<typeof createCarSchema>;

const editCarSchema = z.object({
  plate_number: z.string().min(1, "Plate number is required"),
  unit_code: z.string().optional(),
  model: z.string().min(1, "Model is required"),
  type: z.enum(["INTERNAL", "EXTERNAL"]),
  origin_location: z.string().optional(),
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE"]),
});
type EditCarForm = z.infer<typeof editCarSchema>;

export default function CarsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [view, setView] = useState<"cards" | "table">("cards");

  const { data: cars, isLoading } = useCars();
  const createMutation = useCreateCar();
  const updateMutation = useUpdateCar();

  const filtered = cars?.filter((c) => {
    const matchSearch =
      search === "" ||
      c.model.toLowerCase().includes(search.toLowerCase()) ||
      c.plate_number.toLowerCase().includes(search.toLowerCase()) ||
      c.unit_code?.toLowerCase().includes(search.toLowerCase()) ||
      c.origin_location?.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const PAGE_SIZE = 10;
  const { page, setPage, pageCount, total, start, pageItems } = usePagination(
    filtered ?? [],
    PAGE_SIZE,
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateCarForm>({
    resolver: zodResolver(createCarSchema),
    defaultValues: { type: "INTERNAL" },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    control: editControl,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditCarForm>({ resolver: zodResolver(editCarSchema) });

  async function onSubmit(data: CreateCarForm) {
    try {
      await createMutation.mutateAsync(data);
      toast.success("Car added successfully");
      setCreateOpen(false);
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function openEdit(car: Car) {
    setEditingCar(car);
    resetEdit({
      plate_number: car.plate_number,
      unit_code: car.unit_code || "",
      model: car.model,
      type: car.type,
      origin_location: car.origin_location || "",
      status: car.status,
    });
  }

  async function onEditSubmit(data: EditCarForm) {
    if (!editingCar) return;
    try {
      await updateMutation.mutateAsync({ id: editingCar.id, data });
      toast.success("Car updated successfully");
      setEditingCar(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <DashboardShell title="Cars">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search cars…"
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
                <SelectItem value="IN_USE">In Use</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {view === "cards" && (
              <div className="hidden items-center gap-1.5 sm:flex">
                <span className="text-xs text-gray-400">Revenue:</span>
                <PeriodToggle surface="cars" />
              </div>
            )}
            <div className="flex rounded-lg border border-gray-200 p-0.5">
              <button
                type="button"
                onClick={() => setView("cards")}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                  view === "cards"
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
                title="Tampilan kartu"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("table")}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                  view === "table"
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
                title="Tampilan tabel"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Car
            </Button>
          </div>
        </div>

        {view === "cards" ? (
          isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
                />
              ))}
            </div>
          ) : filtered?.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400">
              No cars found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pageItems.map((car) => (
                <CarCard key={car.id} car={car} onEdit={openEdit} />
              ))}
            </div>
          )
        ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide w-12">
                  No
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide w-16">
                  Foto
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Unit Code
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Model
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Plate Number
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
                    {[...Array(9)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-10 text-gray-400 text-sm"
                  >
                    No cars found.
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((car, idx) => (
                  <TableRow key={car.id} className="hover:bg-gray-50/50">
                    <TableCell className="text-sm text-gray-400 tabular-nums">
                      {start + idx + 1}
                    </TableCell>
                    <TableCell>
                      {/* Sprint 3: click thumbnail to upload/replace photo. */}
                      <CarPhotoCell car={car} />
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-gray-900">
                      {car.unit_code || "—"}
                    </TableCell>
                    <TableCell className="font-medium text-sm text-gray-900">
                      {car.model}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-600">
                      {car.plate_number}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          car.type === "INTERNAL"
                            ? "text-xs bg-blue-50 text-blue-700 border-blue-200"
                            : "text-xs bg-purple-50 text-purple-700 border-purple-200"
                        }
                      >
                        {car.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 hidden lg:table-cell">
                      {car.origin_location || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${CAR_STATUS_STYLES[car.status]}`}
                      >
                        {car.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(car)}
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
        )}

        <TablePagination
          page={page}
          pageCount={pageCount}
          total={total}
          start={start}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="cars"
        />
      </div>

      {/* Add Car Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Car</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="unit_code">Unit Code</Label>
                <Input
                  id="unit_code"
                  placeholder="e.g. FCB, ARA, VLZ1"
                  {...register("unit_code")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  placeholder="e.g. Toyota Avanza"
                  {...register("model")}
                />
                {errors.model && (
                  <p className="text-xs text-red-500">{errors.model.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="plate_number">Plate Number</Label>
                <Input
                  id="plate_number"
                  placeholder="e.g. B 1234 XYZ"
                  {...register("plate_number")}
                />
                {errors.plate_number && (
                  <p className="text-xs text-red-500">
                    {errors.plate_number.message}
                  </p>
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
                          External / Rental Partner
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="origin_location">Asal / Base Location</Label>
              <Input
                id="origin_location"
                placeholder="e.g. Arasya pool, Depok, Bandung"
                {...register("origin_location")}
              />
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

      {/* Edit Car Dialog */}
      <Dialog
        open={!!editingCar}
        onOpenChange={(open) => !open && setEditingCar(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Car</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit_unit_code">Unit Code</Label>
                <Input
                  id="edit_unit_code"
                  placeholder="e.g. FCB, ARA, VLZ1"
                  {...registerEdit("unit_code")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_model">Model</Label>
                <Input
                  id="edit_model"
                  placeholder="e.g. Toyota Avanza"
                  {...registerEdit("model")}
                />
                {editErrors.model && (
                  <p className="text-xs text-red-500">
                    {editErrors.model.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit_plate_number">Plate Number</Label>
                <Input
                  id="edit_plate_number"
                  placeholder="e.g. B 1234 XYZ"
                  {...registerEdit("plate_number")}
                />
                {editErrors.plate_number && (
                  <p className="text-xs text-red-500">
                    {editErrors.plate_number.message}
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
                          External / Rental Partner
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
                        <SelectItem value="IN_USE">In Use</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_origin_location">
                  Asal / Base Location
                </Label>
                <Input
                  id="edit_origin_location"
                  placeholder="e.g. Arasya pool, Depok, Bandung"
                  {...registerEdit("origin_location")}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingCar(null)}
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
