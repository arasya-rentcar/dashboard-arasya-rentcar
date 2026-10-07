"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, Edit, Plus, Search, Eye } from "lucide-react";
import Link from "next/link";
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
import { useEtollCards } from "@/hooks/useEtollCards";
import TablePagination, { usePagination } from "@/components/dashboard/TablePagination";
import QueryError from "@/components/dashboard/QueryError";
import { Driver, DriverStatus } from "@/types";
import { getErrorMessage } from "@/lib/utils";


const DRIVER_STATUS_STYLES: Record<DriverStatus, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ON_DUTY: "bg-amber-50 text-amber-700 border-amber-200",
  OFF: "bg-gray-100 text-gray-500 border-gray-200",
};

type ErrKey = "errUser" | "errName" | "errPhone";

// Validation messages come from next-intl, so the schemas are built per locale.
function buildSchemas(t: (key: ErrKey) => string) {
  const create = z.object({
    user_id: z.string().uuid(t("errUser")),
    name: z.string().min(1, t("errName")),
    phone: z.string().min(1, t("errPhone")),
    type: z.enum(["INTERNAL", "EXTERNAL"]),
    location: z.string().optional(),
  });
  const edit = z.object({
    name: z.string().min(1, t("errName")),
    phone: z.string().min(1, t("errPhone")),
    type: z.enum(["INTERNAL", "EXTERNAL"]),
    location: z.string().optional(),
    status: z.enum(["AVAILABLE", "ON_DUTY", "OFF"]),
  });
  return { create, edit };
}
type CreateDriverForm = z.infer<ReturnType<typeof buildSchemas>["create"]>;
type EditDriverForm = z.infer<ReturnType<typeof buildSchemas>["edit"]>;

export default function DriversPage() {
  const t = useTranslations("driversPage");
  const tt = useTranslations("terms");
  const ts = useTranslations("driverStatus");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const schemas = useMemo(() => buildSchemas(t), [t]);

  const { data: drivers, isLoading, isError, refetch } = useDrivers();
  // Office e-toll cards a driver holds now ("Flazz 3, e-Money 1").
  const { data: etollCards } = useEtollCards("ACTIVE");
  const heldBy = new Map<string, string>();
  for (const c of etollCards ?? []) {
    if (!c.holder) continue;
    const prev = heldBy.get(c.holder.driver.id);
    heldBy.set(c.holder.driver.id, prev ? `${prev}, ${c.name}` : c.name);
  }
  const { data: users } = useUsers();
  const createMutation = useCreateDriver();
  const updateMutation = useUpdateDriver();

  const filtered = drivers?.filter((d) => {
    const matchSearch =
      search === "" ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search) ||
      d.location?.toLowerCase().includes(search.toLowerCase()) ||
      heldBy.get(d.id)?.toLowerCase().includes(search.toLowerCase()) ||
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
    resolver: zodResolver(schemas.create),
    defaultValues: { type: "INTERNAL" },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    control: editControl,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditDriverForm>({ resolver: zodResolver(schemas.edit) });

  async function onSubmit(data: CreateDriverForm) {
    try {
      await createMutation.mutateAsync(data);
      toast.success(t("okCreated"));
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
      toast.success(t("okUpdated"));
      setEditingDriver(null);
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
                <SelectItem value="ON_DUTY">{ts('ON_DUTY')}</SelectItem>
                <SelectItem value="OFF">{ts('OFF')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="w-full sm:ml-auto sm:w-auto">
            <Plus className="h-4 w-4" />
            {t('addDriver')}
          </Button>
        </div>

        {isError ? (
          <QueryError onRetry={() => refetch()} />
        ) : (
        <>
        {/* Phones and tablets: one card per driver, actions always in reach.
            The full table starts at lg, where its columns fit beside the sidebar. */}
        <div className="lg:hidden">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
              ))}
            </div>
          ) : filtered?.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white py-10 text-center text-sm text-gray-400">
              {t('noDrivers')}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {pageItems.map((driver) => (
                <li key={driver.id} className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Link
                      href={`/dashboard/drivers/${driver.id}`}
                      className="block break-words text-sm font-semibold text-gray-900 hover:underline"
                    >
                      {driver.name}
                    </Link>
                    <p className="break-words text-sm text-gray-600 tabular-nums">
                      {driver.phone}
                      {driver.location && (
                        <span className="text-gray-400"> · {driver.location}</span>
                      )}
                    </p>
                    {heldBy.get(driver.id) && (
                      <p className="flex items-center gap-1 text-xs text-violet-700" title={t('holdsEtoll')}>
                        <CreditCard className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 break-words">{heldBy.get(driver.id)}</span>
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <Badge
                        variant="outline"
                        className={
                          driver.type === "INTERNAL"
                            ? "text-xs bg-blue-50 text-blue-700 border-blue-200"
                            : "text-xs bg-purple-50 text-purple-700 border-purple-200"
                        }
                      >
                        {driver.type === "INTERNAL" ? tt('internal') : tt('external')}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${DRIVER_STATUS_STYLES[driver.status]}`}
                      >
                        {ts(driver.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button variant="outline" size="icon-sm" asChild>
                      <Link
                        href={`/dashboard/drivers/${driver.id}`}
                        aria-label={`${t('detail')}: ${driver.name}`}
                        title={t('detail')}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => openEdit(driver)}
                      aria-label={`${t('edit')}: ${driver.name}`}
                      title={t('edit')}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hidden bg-white rounded-xl border border-gray-200 shadow-none overflow-hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide w-12">
                  {t('colNo')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('colName')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('colPhone')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">
                  {t('colEmail')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('colType')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">
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
                    {t('noDrivers')}
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((driver, idx) => (
                  <TableRow key={driver.id} className="hover:bg-gray-50/50">
                    <TableCell className="text-sm text-gray-400 tabular-nums">
                      {start + idx + 1}
                    </TableCell>
                    <TableCell className="min-w-[12rem] whitespace-normal font-medium text-sm text-gray-900">
                      {driver.name}
                      {heldBy.get(driver.id) && (
                        <span
                          className="mt-0.5 flex items-center gap-1 text-xs font-normal text-violet-700"
                          title={t('holdsEtoll')}
                        >
                          <CreditCard className="h-3 w-3 shrink-0" />
                          {heldBy.get(driver.id)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {driver.phone}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 hidden xl:table-cell">
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
                        {driver.type === "INTERNAL" ? tt('internal') : tt('external')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 hidden xl:table-cell">
                      {driver.location || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${DRIVER_STATUS_STYLES[driver.status]}`}
                      >
                        {ts(driver.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/drivers/${driver.id}`}>
                            <Eye className="h-4 w-4" />
                            {t('detail')}
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(driver)}
                        >
                          <Edit className="h-4 w-4" />
                          {t('edit')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        </>
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

      {/* Create Driver Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('addNewDriver')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="d_user">{t('userAccount')}</Label>
              <Controller
                control={control}
                name="user_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="d_user" className="w-full">
                      <SelectValue placeholder={t('selectUser')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers?.length === 0 && (
                        <SelectItem value="none" disabled>
                          {t('noAvailableUsers')}
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
              <Label htmlFor="d_name">{t('name')}</Label>
              <Input id="d_name" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="d_phone">{t('phone')}</Label>
                <Input id="d_phone" {...register("phone")} />
                {errors.phone && (
                  <p className="text-xs text-red-500">{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d_type">{t('type')}</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="d_type" className="w-full">
                        <SelectValue placeholder={t('typePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INTERNAL">
                          {t('internalArasya')}
                        </SelectItem>
                        <SelectItem value="EXTERNAL">
                          {t('externalFreelance')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="d_location">{t('baseLocation')}</Label>
              <Input
                id="d_location"
                placeholder={t('basePlaceholder')}
                {...register("location")}
              />
            </div>


            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('addDriver')}
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
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('editDriver')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit_d_name">{t('name')}</Label>
              <Input id="edit_d_name" {...registerEdit("name")} />
              {editErrors.name && (
                <p className="text-xs text-red-500">
                  {editErrors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit_d_phone">{t('phone')}</Label>
                <Input id="edit_d_phone" {...registerEdit("phone")} />
                {editErrors.phone && (
                  <p className="text-xs text-red-500">
                    {editErrors.phone.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_d_type">{t('type')}</Label>
                <Controller
                  control={editControl}
                  name="type"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="edit_d_type" className="w-full">
                        <SelectValue placeholder={t('typePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INTERNAL">
                          {t('internalArasya')}
                        </SelectItem>
                        <SelectItem value="EXTERNAL">
                          {t('externalFreelance')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit_d_status">{t('status')}</Label>
                <Controller
                  control={editControl}
                  name="status"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="edit_d_status" className="w-full">
                        <SelectValue placeholder={t('status')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">{ts('AVAILABLE')}</SelectItem>
                        <SelectItem value="ON_DUTY">{ts('ON_DUTY')}</SelectItem>
                        <SelectItem value="OFF">{ts('OFF')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_d_location">{t('baseLocation')}</Label>
                <Input
                  id="edit_d_location"
                  placeholder={t('basePlaceholder')}
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
