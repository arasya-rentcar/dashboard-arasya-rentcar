"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
import QueryError from "@/components/dashboard/QueryError";
import { Car, CarStatus } from "@/types";
import { getErrorMessage } from "@/lib/utils";

const CAR_STATUS_STYLES: Record<CarStatus, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  IN_USE: "bg-amber-50 text-amber-700 border-amber-200",
  MAINTENANCE: "bg-red-50 text-red-700 border-red-200",
};

// Validation messages come from next-intl, so the schemas are built per locale.
function buildSchemas(t: (key: "errPlate" | "errModel") => string) {
  const create = z.object({
    plate_number: z.string().min(1, t("errPlate")),
    unit_code: z.string().optional(),
    model: z.string().min(1, t("errModel")),
    type: z.enum(["INTERNAL", "EXTERNAL"]),
    origin_location: z.string().optional(),
  });
  const edit = create.extend({
    status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE"]),
  });
  return { create, edit };
}
type CreateCarForm = z.infer<ReturnType<typeof buildSchemas>["create"]>;
type EditCarForm = z.infer<ReturnType<typeof buildSchemas>["edit"]>;

export default function CarsPage() {
  const t = useTranslations("carsPage");
  const tt = useTranslations("terms");
  const ts = useTranslations("carStatus");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [view, setView] = useState<"cards" | "table">("cards");
  const schemas = useMemo(() => buildSchemas(t), [t]);

  const { data: cars, isLoading, isError, refetch } = useCars();
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
    resolver: zodResolver(schemas.create),
    defaultValues: { type: "INTERNAL" },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    control: editControl,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditCarForm>({ resolver: zodResolver(schemas.edit) });

  async function onSubmit(data: CreateCarForm) {
    try {
      await createMutation.mutateAsync(data);
      toast.success(t("okAdded"));
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
      toast.success(t("okUpdated"));
      setEditingCar(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <DashboardShell title={t('title')}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
              <Input
                type="search"
                aria-label={t('searchPlaceholder')}
                placeholder={t('searchPlaceholder')}
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 shrink-0" aria-label={t('colStatus')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('allStatus')}</SelectItem>
                <SelectItem value="AVAILABLE">{ts('AVAILABLE')}</SelectItem>
                <SelectItem value="IN_USE">{ts('IN_USE')}</SelectItem>
                <SelectItem value="MAINTENANCE">{ts('MAINTENANCE')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
            {view === "cards" && (
              <div className="flex items-center gap-1.5">
                <span className="hidden text-xs text-gray-400 sm:inline">{t('revenue')}</span>
                <PeriodToggle surface="cars" />
              </div>
            )}
            <div className="ml-auto flex rounded-lg border border-gray-200 p-0.5 sm:ml-0" role="group">
              <button
                type="button"
                aria-label={t('cardView')}
                aria-pressed={view === "cards"}
                onClick={() => setView("cards")}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                  view === "cards"
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
                title={t('cardView')}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={t('tableView')}
                aria-pressed={view === "table"}
                onClick={() => setView("table")}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                  view === "table"
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
                title={t('tableView')}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('addCar')}
            </Button>
          </div>
        </div>

        {isError ? (
          <QueryError onRetry={() => refetch()} />
        ) : view === "cards" ? (
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
              {t('noCars')}
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
                  {t('colNo')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide w-16">
                  {t('colPhoto')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('colUnitCode')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('colModel')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('colPlate')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('colType')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                  {t('colBase')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('colStatus')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                  {t('colAction')}
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
                    {t('noCars')}
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
                    <TableCell className="max-w-[220px] truncate font-medium text-sm text-gray-900" title={car.model}>
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
                        {car.type === "INTERNAL" ? tt('internal') : tt('external')}
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
                        {ts(car.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(car)}
                      >
                        <Edit className="h-4 w-4" />
                        {t('edit')}
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
          label={t('paginationLabel')}
        />
      </div>

      {/* Add Car Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('addNewCar')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="unit_code">{t('unitCode')}</Label>
                <Input
                  id="unit_code"
                  placeholder={t('unitCodePlaceholder')}
                  {...register("unit_code")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="model">{t('model')}</Label>
                <Input
                  id="model"
                  placeholder={t('modelPlaceholder')}
                  {...register("model")}
                />
                {errors.model && (
                  <p className="text-xs text-red-500">{errors.model.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="plate_number">{t('plateNumber')}</Label>
                <Input
                  id="plate_number"
                  placeholder={t('platePlaceholder')}
                  {...register("plate_number")}
                />
                {errors.plate_number && (
                  <p className="text-xs text-red-500">
                    {errors.plate_number.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="car_type">{t('type')}</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="car_type" className="w-full">
                        <SelectValue placeholder={t('typePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INTERNAL">
                          {t('internalArasya')}
                        </SelectItem>
                        <SelectItem value="EXTERNAL">
                          {t('externalPartner')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="origin_location">{t('baseLocation')}</Label>
              <Input
                id="origin_location"
                placeholder={t('basePlaceholder')}
                {...register("origin_location")}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('addCar')}
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
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('editCar')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit_unit_code">{t('unitCode')}</Label>
                <Input
                  id="edit_unit_code"
                  placeholder={t('unitCodePlaceholder')}
                  {...registerEdit("unit_code")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_model">{t('model')}</Label>
                <Input
                  id="edit_model"
                  placeholder={t('modelPlaceholder')}
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
                <Label htmlFor="edit_plate_number">{t('plateNumber')}</Label>
                <Input
                  id="edit_plate_number"
                  placeholder={t('platePlaceholder')}
                  {...registerEdit("plate_number")}
                />
                {editErrors.plate_number && (
                  <p className="text-xs text-red-500">
                    {editErrors.plate_number.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_car_type">{t('type')}</Label>
                <Controller
                  control={editControl}
                  name="type"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="edit_car_type" className="w-full">
                        <SelectValue placeholder={t('typePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INTERNAL">
                          {t('internalArasya')}
                        </SelectItem>
                        <SelectItem value="EXTERNAL">
                          {t('externalPartner')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit_car_status">{t('status')}</Label>
                <Controller
                  control={editControl}
                  name="status"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="edit_car_status" className="w-full">
                        <SelectValue placeholder={t('status')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">{ts('AVAILABLE')}</SelectItem>
                        <SelectItem value="IN_USE">{ts('IN_USE')}</SelectItem>
                        <SelectItem value="MAINTENANCE">{ts('MAINTENANCE')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_origin_location">
                  {t('baseLocation')}
                </Label>
                <Input
                  id="edit_origin_location"
                  placeholder={t('basePlaceholder')}
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
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('saveChanges')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
