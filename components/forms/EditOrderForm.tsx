"use client";

import { useTranslations } from "next-intl";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Order } from "@/types";
import {
  formatCurrency,
  isoToWibDate,
  isoToWibDateTimeLocal,
  wibDateToIso,
  wibDateTimeToIso,
} from "@/lib/utils";
import { expandServiceItemsByDays } from "@/lib/expandServiceItems";
import OrderServiceItemsEditor, {
  ServiceItemFormValue,
} from "./OrderServiceItemsEditor";

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  is_primary: z.boolean().optional(),
});
const serviceItemSchema = z.object({
  // The existing day this row is (kept with its driver, status and costs by
  // the API); absent for a new row.
  id: z.string().optional(),
  line_status: z.string().optional(),
  service_date: z.string().optional(),
  start_at: z.string().optional(),
  end_at: z.string().optional(),
  description: z.string().optional(),
  service_kind: z.string().optional(),
  service_package: z.string().optional(),
  pickup_location: z.string().min(1),
  dropoff_location: z.string().min(1),
  quantity: z.string().min(1),
  unit_price: z.string().min(1),
  notes: z.string().optional(),
});
// The price-change reason is checked on submit (only when a price actually
// changed): checking it in the schema also blocked saving after the price was
// changed back, with the error hidden together with the reason field.
const schema = z.object({
  customers: z.array(customerSchema).min(1),
  service_items: z.array(serviceItemSchema).min(1),
  change_reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;
interface Props {
  order: Order;
  activeInvoiceTotal: number;
  onSubmit: (data: any) => Promise<void>;
  isLoading: boolean;
}
const toDateTimeLocal = isoToWibDateTimeLocal;
const toDate = isoToWibDate;
const iso = wibDateTimeToIso;
const dateIso = wibDateToIso;

export default function EditOrderForm({
  order,
  activeInvoiceTotal,
  onSubmit,
  isLoading,
}: Props) {
  const tEdit = useTranslations("editOrderForm");
  const originalPrice = Number(order.final_price);
  const initialCustomers = order.customers?.length
    ? order.customers.map((c, index) => ({
        name: c.name,
        phone: c.phone || "",
        is_primary: c.is_primary || index === 0,
      }))
    : [
        {
          name: order.customer_name,
          phone: order.customer_phone,
          is_primary: true,
        },
      ];
  const initialItems: FormValues["service_items"] = order.service_items?.length
    ? order.service_items.map((item) => ({
        id: item.id,
        line_status: item.line_status ?? undefined,
        service_date: toDate(item.service_date),
        start_at: toDateTimeLocal(item.start_at),
        end_at: toDateTimeLocal(item.end_at),
        description: item.description || "",
        service_kind: item.service_kind || "12H",
        // An existing day without a package was billed as All-in; keep it.
        service_package: item.service_package || "ALL-IN",
        pickup_location: item.pickup_location,
        dropoff_location: item.dropoff_location,
        quantity: String(item.quantity || 1),
        unit_price: String(Number(item.unit_price || 0)),
        notes: item.notes || "",
      }))
    : [
        {
          service_date: "",
          start_at: toDateTimeLocal(order.service_start_at),
          end_at: toDateTimeLocal(order.service_end_at),
          description: "",
          service_kind: "12H",
          service_package: "ALL-IN X PARKIR",
          pickup_location: order.pickup_location,
          dropoff_location: order.dropoff_location,
          quantity: "1",
          unit_price: String(originalPrice),
          notes: "",
        },
      ];
  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customers: initialCustomers,
      service_items: initialItems,
      change_reason: undefined,
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "customers",
  });
  const customers = watch("customers");
  const items = watch("service_items");
  const original = new Map(
    (order.service_items ?? []).map((l) => [l.id, l] as const),
  );
  // One row per day. An id stays only on the first row carrying one of this
  // order's days; a copied row is a new day (the API refuses repeated ids).
  function toDays(rows: FormValues["service_items"]) {
    const seen = new Set<string>();
    return expandServiceItemsByDays(rows).map((d) => {
      if (d.id && original.has(d.id) && !seen.has(d.id)) {
        seen.add(d.id);
        return d;
      }
      return { ...d, id: undefined, line_status: undefined };
    });
  }
  // The total as the API keeps it: days that are not cancelled + billable
  // charges (Biaya Tambahan, billed trip costs).
  const days = toDays(items);
  const charges = (order.adjustments ?? [])
    .filter((a) => a.is_billable)
    .reduce((sum, a) => sum + Number(a.amount || 0) * (a.quantity ?? 1), 0);
  const newPrice =
    days
      .filter((d) => d.line_status !== "CANCELLED")
      .reduce((sum, d) => sum + Number(d.unit_price || 0), 0) + charges;
  // A reason is asked exactly when a price was edited (as the API checks): a
  // day's price changed, a priced day added, or a priced open day removed.
  const sentIds = new Set(days.map((d) => d.id).filter(Boolean));
  const priceChanged =
    days.some((d) => {
      const before = d.id ? original.get(d.id) : undefined;
      if (!before) return Number(d.unit_price || 0) !== 0;
      return (
        before.line_status !== "CANCELLED" &&
        Number(d.unit_price || 0) !== Number(before.total_price || 0)
      );
    }) ||
    (order.service_items ?? []).some(
      (l) =>
        !!l.id &&
        !sentIds.has(l.id) &&
        l.line_status !== "CANCELLED" &&
        Number(l.total_price || 0) !== 0,
    );
  const belowInvoiceTotal = priceChanged && newPrice < activeInvoiceTotal;
  function setPrimary(index: number) {
    customers.forEach((_, i) =>
      setValue(`customers.${i}.is_primary`, i === index),
    );
  }
  async function handleFormSubmit(values: FormValues) {
    if (priceChanged && !values.change_reason?.trim()) {
      setError("change_reason", { message: tEdit("reasonRequired") }, { shouldFocus: true });
      return;
    }
    const primary =
      values.customers.find((c) => c.is_primary) || values.customers[0];
    await onSubmit({
      customer_name: primary.name,
      customer_phone: primary.phone || "",
      customers: values.customers.map((c, index) => ({
        name: c.name,
        phone: c.phone || undefined,
        is_primary: c.is_primary || index === 0,
      })),
      pickup_location: values.service_items[0]?.pickup_location || "-",
      dropoff_location: values.service_items[0]?.dropoff_location || "-",
      order_date: order.order_date,
      service_start_at: iso(values.service_items[0]?.start_at),
      service_end_at: iso(values.service_items[0]?.end_at),
      final_price: newPrice,
      change_reason: priceChanged ? values.change_reason : undefined,
      service_items: toDays(values.service_items).map(
        (item, index) => ({
          // Existing days are sent back with their id so the API keeps their
          // driver, status, costs and payable (only the content changes).
          ...(item.id ? { id: item.id } : {}),
          service_date: dateIso(item.service_date),
          start_at: iso(item.start_at),
          end_at: iso(item.end_at),
          description: item.description || undefined,
          service_kind: item.service_kind || undefined,
          service_package: item.service_package || undefined,
          pickup_location: item.pickup_location,
          dropoff_location: item.dropoff_location,
          quantity: 1,
          unit_price: Number(item.unit_price || 0),
          total_price: Number(item.unit_price || 0),
          notes: item.notes || undefined,
          sort_order: index,
        }),
      ),
    });
  }
  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-1 pb-4 pr-2 sm:space-y-5">
        <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {tEdit("customerTitle")}
              </p>
              <p className="text-xs text-gray-500">
                {tEdit("customerHint")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: "", phone: "", is_primary: false })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> {tEdit("addPic")}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-xl border border-gray-100 bg-gray-50/60 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    aria-pressed={!!customers?.[index]?.is_primary}
                    className={
                      customers?.[index]?.is_primary
                        ? "min-h-7 rounded-full bg-gray-900 px-2.5 py-1 text-xs font-medium text-white"
                        : "min-h-7 rounded-full px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    }
                    onClick={() => setPrimary(index)}
                  >
                    {customers?.[index]?.is_primary
                      ? tEdit("primaryPic")
                      : tEdit("setPrimary")}
                  </button>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(index)}
                      className="text-red-500 hover:text-red-600"
                      aria-label={tEdit("removePic")}
                      title={tEdit("removePic")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`edit-pic-${index}-name`}>{tEdit("name")}</Label>
                    <Input
                      id={`edit-pic-${index}-name`}
                      aria-invalid={!!errors.customers?.[index]?.name}
                      {...register(`customers.${index}.name`)}
                    />
                    {errors.customers?.[index]?.name && (
                      <p className="text-xs text-red-500">{tEdit("nameRequired")}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`edit-pic-${index}-phone`}>{tEdit("phone")}</Label>
                    <Input
                      id={`edit-pic-${index}-phone`}
                      type="tel"
                      inputMode="tel"
                      {...register(`customers.${index}.phone`)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-1 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs leading-5 text-gray-600 shadow-sm sm:p-4">
          <p>{tEdit("orderDateNote")}</p>
          <p>{tEdit("assignedDaysNote")}</p>
        </section>

        <OrderServiceItemsEditor
          control={control}
          register={register}
          setValue={setValue}
          watch={watch}
          errors={errors}
        />

        {priceChanged && (
          <section className="rounded-2xl border border-amber-100 bg-amber-50 p-3 shadow-sm sm:p-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1.4fr] lg:items-end">
              <div className="text-xs text-amber-800 space-y-1">
                <p className="font-semibold">
                  {tEdit("priceChange")}: {formatCurrency(originalPrice)} →{" "}
                  {formatCurrency(newPrice || 0)}
                </p>
                <p>
                  {tEdit("activeInvoiceTotal")}: {formatCurrency(activeInvoiceTotal)}
                </p>
                <p>
                  {tEdit("invoicesWontChange")}
                </p>
                {belowInvoiceTotal && (
                  <p className="font-medium text-red-600">
                    {tEdit("belowInvoiceTotal")}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-change-reason">
                  {tEdit("reasonForChange")} <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="edit-change-reason"
                  placeholder={tEdit("reasonPlaceholder")}
                  aria-invalid={!!errors.change_reason}
                  {...register("change_reason")}
                />
                {errors.change_reason && (
                  <p className="text-xs text-red-500">
                    {errors.change_reason.message}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-white px-1 pt-3">
        <div className="text-xs text-gray-500">
          {tEdit("finalPrice")}:{" "}
          <span className="font-semibold text-gray-900">
            {formatCurrency(newPrice || 0)}
          </span>
        </div>
        <Button type="submit" disabled={isLoading || belowInvoiceTotal}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tEdit("saveChanges")}
        </Button>
      </div>
    </form>
  );
}
