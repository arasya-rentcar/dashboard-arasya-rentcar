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
import { formatCurrency } from "@/lib/utils";
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
const schema = z
  .object({
    customers: z.array(customerSchema).min(1),
    service_items: z.array(serviceItemSchema).min(1),
    change_reason: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (
      values.change_reason !== undefined &&
      values.change_reason.trim().length === 0
    )
      ctx.addIssue({
        code: "custom",
        path: ["change_reason"],
        message: "Reason is required when changing price",
      });
  });
type FormValues = z.infer<typeof schema>;
interface Props {
  order: Order;
  activeInvoiceTotal: number;
  onSubmit: (data: any) => Promise<void>;
  isLoading: boolean;
}
function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}
function toDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}
function iso(v?: string) {
  return v ? new Date(v).toISOString() : undefined;
}
function dateIso(v?: string) {
  return v ? new Date(`${v}T00:00:00`).toISOString() : undefined;
}

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
  const initialItems: ServiceItemFormValue[] = order.service_items?.length
    ? order.service_items.map((item) => ({
        service_date: toDate(item.service_date),
        start_at: toDateTimeLocal(item.start_at),
        end_at: toDateTimeLocal(item.end_at),
        description: item.description || "",
        service_kind: item.service_kind || "12H",
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
          service_package: "ALL-IN",
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
  const newPrice = items.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 1) * Number(item.unit_price || 0),
    0,
  );
  const priceChanged = newPrice !== originalPrice;
  const belowInvoiceTotal = priceChanged && newPrice < activeInvoiceTotal;
  function setPrimary(index: number) {
    customers.forEach((_, i) =>
      setValue(`customers.${i}.is_primary`, i === index),
    );
  }
  async function handleFormSubmit(values: FormValues) {
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
      service_items: expandServiceItemsByDays(values.service_items).map(
        (item, index) => ({
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
      className="flex max-h-[calc(96vh-96px)] flex-col overflow-hidden"
    >
      <div className="flex-1 space-y-5 overflow-y-auto px-1 pb-24 pr-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm font-semibold text-gray-900">
                Customer / PIC
              </Label>
              <p className="text-xs text-gray-500">
                Primary PIC is used as the main customer contact.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: "", phone: "", is_primary: false })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add PIC
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
                    className={
                      customers?.[index]?.is_primary
                        ? "rounded-full bg-gray-900 px-2.5 py-1 text-xs font-medium text-white"
                        : "text-xs font-medium text-gray-500 hover:text-gray-900"
                    }
                    onClick={() => setPrimary(index)}
                  >
                    {customers?.[index]?.is_primary
                      ? "Primary PIC"
                      : "Set primary"}
                  </button>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{tEdit("name")}</Label>
                    <Input {...register(`customers.${index}.name`)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{tEdit("phone")}</Label>
                    <Input {...register(`customers.${index}.phone`)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs leading-5 text-gray-600 shadow-sm">
          {tEdit("orderDateNote")}
        </section>

        <OrderServiceItemsEditor
          control={control}
          register={register}
          setValue={setValue}
          watch={watch}
          errors={errors}
        />

        {priceChanged && (
          <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
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
                <Label>{tEdit("reasonForChange")}</Label>
                <Input
                  placeholder={tEdit("reasonPlaceholder")}
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
      <div className="sticky bottom-0 -mx-1 flex items-center justify-between border-t border-gray-100 bg-white/95 px-1 py-3 backdrop-blur">
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
