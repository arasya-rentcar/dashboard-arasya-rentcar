"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, wibDateToIso, wibDateTimeToIso } from "@/lib/utils";
import { expandServiceItemsByDays } from "@/lib/expandServiceItems";
import OrderServiceItemsEditor, {
  ServiceItemFormValue,
} from "./OrderServiceItemsEditor";
import CustomerPicker from "./CustomerPicker";
import VendorUnitPicker, { type VendorUnitValue } from "./VendorUnitPicker";
import type { Customer } from "@/types";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
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
  pickup_location: z.string().min(1, "Pickup spot is required"),
  dropoff_location: z.string().min(1, "Dropoff spot is required"),
  quantity: z.string().min(1),
  unit_price: z.string().min(1),
  notes: z.string().optional(),
});
const additionalSchema = z.object({
  type: z.string().min(1),
  description: z.string().optional(),
  amount: z.string().optional(),
});
const schema = z.object({
  customers: z.array(customerSchema).min(1),
  service_items: z.array(serviceItemSchema).min(1),
  additionals: z.array(additionalSchema).optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;
/** Prefill from a website lead (Lead Website → "Buat order"). */
export interface CreateOrderPrefill {
  webLeadId: string;
  leadCode: string;
  customerName: string;
  serviceDate?: string; // YYYY-MM-DD
  startAt?: string; // YYYY-MM-DDTHH:mm (datetime-local)
  pickup: string;
  dropoff?: string;
  notes?: string;
}
interface Props {
  onSubmit: (data: any) => Promise<void>;
  isLoading: boolean;
  prefill?: CreateOrderPrefill | null;
}
const iso = wibDateTimeToIso;
const dateIso = wibDateToIso;
const defaultItem: ServiceItemFormValue = {
  service_date: "",
  start_at: "",
  end_at: "",
  description: "",
  service_kind: "12H",
  service_package: "ALL-IN",
  pickup_location: "",
  dropoff_location: "",
  quantity: "1",
  unit_price: "",
  notes: "",
};

const ADDITIONAL_TYPE_KEYS: { key: string; value: string }[] = [
  { key: "typeOvertime", value: "OVERTIME" },
  { key: "typeParking", value: "PARKING" },
  { key: "typeToll", value: "TOLL" },
  { key: "typeAdditional", value: "OTHER" },
];

export default function CreateOrderForm({ onSubmit, isLoading, prefill }: Props) {
  const t = useTranslations("createOrder");
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customers: [{ name: prefill?.customerName ?? "", phone: "", is_primary: true }],
      service_items: [
        prefill
          ? {
              ...defaultItem,
              service_date: prefill.serviceDate ?? "",
              start_at: prefill.startAt ?? "",
              pickup_location: prefill.pickup,
              dropoff_location: prefill.dropoff ?? "",
            }
          : defaultItem,
      ],
      additionals: [],
      notes: prefill?.notes ?? "",
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "customers",
  });
  const {
    fields: additionalFields,
    append: appendAdditional,
    remove: removeAdditional,
  } = useFieldArray({
    control,
    name: "additionals",
  });
  // Sprint 5 #15/#16: master-customer lock + vendor/unit selection.
  const [masterCustomer, setMasterCustomer] = useState<Customer | null>(null);
  const [vendorUnit, setVendorUnit] = useState<VendorUnitValue>({
    is_external: false,
  });

  function selectMaster(c: Customer) {
    setMasterCustomer(c);
    // Lock the primary PIC fields to the chosen master record.
    const primaryIdx = customers?.findIndex((x) => x.is_primary);
    const idx = primaryIdx != null && primaryIdx >= 0 ? primaryIdx : 0;
    setValue(`customers.${idx}.name`, c.name);
    setValue(`customers.${idx}.phone`, c.phone || "");
  }

  const customers = watch("customers");
  const items = watch("service_items");
  const additionals = watch("additionals");
  const lineTotal = (items || []).reduce(
    (sum, item) =>
      sum + Number(item.quantity || 1) * Number(item.unit_price || 0),
    0,
  );
  const additionalTotal = (additionals || []).reduce(
    (sum, a) => sum + Number(a.amount || 0),
    0,
  );
  const total = lineTotal + additionalTotal;
  const primary = customers?.find((c) => c.is_primary) || customers?.[0];

  function setPrimary(index: number) {
    customers.forEach((_, i) =>
      setValue(`customers.${i}.is_primary`, i === index),
    );
  }

  async function handleFormSubmit(values: FormValues) {
    const mainCustomer =
      values.customers.find((c) => c.is_primary) || values.customers[0];
    const lineSum = values.service_items.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 1) * Number(item.unit_price || 0),
      0,
    );
    const cleanAdditionals = (values.additionals || [])
      .filter((a) => Number(a.amount || 0) > 0)
      .map((a) => ({
        type: a.type,
        description:
          a.description?.trim() ||
          (ADDITIONAL_TYPE_KEYS.find((x) => x.value === a.type)
            ? t(ADDITIONAL_TYPE_KEYS.find((x) => x.value === a.type)!.key)
            : t("typeAdditional")),
        amount: Number(a.amount || 0),
        quantity: 1,
        is_billable: true,
      }));
    await onSubmit({
      customer_id: masterCustomer?.id,
      customer_name: masterCustomer?.name ?? mainCustomer.name,
      customer_phone: masterCustomer?.phone ?? mainCustomer.phone ?? "",
      is_external: vendorUnit.is_external || undefined,
      external_vendor_id: vendorUnit.external_vendor_id,
      external_car_id: vendorUnit.external_car_id,
      customers: values.customers.map((c, index) => ({
        name: c.name,
        phone: c.phone || undefined,
        is_primary: c.is_primary || index === 0,
      })),
      pickup_location: values.service_items[0]?.pickup_location || "-",
      dropoff_location: values.service_items[0]?.dropoff_location || "-",
      order_date: new Date().toISOString(),
      service_start_at: iso(values.service_items[0]?.start_at),
      service_end_at: iso(values.service_items[0]?.end_at),
      final_price: lineSum,
      notes: values.notes?.trim() || undefined,
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
      additionals: cleanAdditionals,
      web_lead_id: prefill?.webLeadId,
    });
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="flex h-[calc(96vh-92px)] min-h-0 flex-col overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto pr-2">
        {prefill && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            {t("fromLead", { code: prefill.leadCode })}
          </div>
        )}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5 min-w-0">
            <section className="rounded-2xl border border-gray-200 bg-white p-4 lg:p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-950">
                    {t("customerPicTitle")}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {t("customerPicDesc")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ name: "", phone: "", is_primary: false })
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> {t("addPic")}
                </Button>
              </div>
              <div className="mb-4">
                <Label className="mb-1.5 block text-xs text-gray-500">
                  {t("existingCustomer")}
                </Label>
                <CustomerPicker
                  selected={masterCustomer}
                  onSelect={selectMaster}
                  onClear={() => setMasterCustomer(null)}
                />
                {masterCustomer && (
                  <p className="mt-1.5 text-[11px] text-emerald-600">
                    {t("masterLocked")}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-xl border border-gray-100 bg-gray-50/70 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        className={
                          customers?.[index]?.is_primary
                            ? "rounded-full bg-gray-900 px-2.5 py-1 text-xs font-medium text-white"
                            : "rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-200 hover:text-gray-900"
                        }
                        onClick={() => setPrimary(index)}
                      >
                        {customers?.[index]?.is_primary
                          ? t("primaryPic")
                          : t("setPrimary")}
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
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>{t("name")}</Label>
                        <Input
                          placeholder={t("namePlaceholder")}
                          {...register(`customers.${index}.name`)}
                        />
                        {errors.customers?.[index]?.name && (
                          <p className="text-xs text-red-500">
                            {errors.customers[index]?.name?.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("phone")}</Label>
                        <Input
                          placeholder={t("phonePlaceholder")}
                          {...register(`customers.${index}.phone`)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs leading-5 text-gray-600 shadow-sm">
              {t("bookingNote")}
            </section>

            <VendorUnitPicker value={vendorUnit} onChange={setVendorUnit} />

            <OrderServiceItemsEditor
              control={control}
              register={register}
              setValue={setValue}
              watch={watch}
              errors={errors}
            />

            <section className="rounded-2xl border border-gray-200 bg-white p-4 lg:p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-950">
                    {t("additionalTitle")}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {t("additionalDesc")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendAdditional({
                      type: "OVERTIME",
                      description: "",
                      amount: "",
                    })
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> {t("addAdditional")}
                </Button>
              </div>
              {additionalFields.length === 0 ? (
                <p className="text-xs text-gray-400">
                  {t("noAdditional")}
                </p>
              ) : (
                <div className="space-y-3">
                  {additionalFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 md:grid-cols-[160px_minmax(0,1fr)_160px_40px] md:items-end"
                    >
                      <div className="space-y-1.5">
                        <Label>{t("type")}</Label>
                        <select
                          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          {...register(`additionals.${index}.type`)}
                        >
                          {ADDITIONAL_TYPE_KEYS.map((at) => (
                            <option key={at.value} value={at.value}>
                              {t(at.key)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("labelNote")}</Label>
                        <Input
                          placeholder={t("labelNotePlaceholder")}
                          {...register(`additionals.${index}.description`)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("amountRp")}</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...register(`additionals.${index}.amount`)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAdditional(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 lg:p-5 shadow-sm">
              <div className="space-y-1.5">
                <Label>{t("notesLabel")}</Label>
                <Textarea
                  rows={2}
                  placeholder={t("notesPlaceholder")}
                  {...register("notes")}
                />
              </div>
            </section>
          </div>

          <aside className="hidden lg:block min-w-0">
            <div className="sticky top-0 space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t("orderSummary")}
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-950">
                  {formatCurrency(total || 0)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {t("summaryDesc")}
                </p>
              </div>
              <div className="space-y-3 border-t border-gray-200 pt-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">{t("primaryPic")}</p>
                  <p className="font-medium text-gray-900">
                    {primary?.name || t("notFilledYet")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {primary?.phone || t("noPhoneYet")}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {t("serviceRows", { count: items?.length || 0 })}
                  </p>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(lineTotal || 0)}
                  </p>
                </div>
                {additionalTotal > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {t("additionalCount", { count: additionalFields.length })}
                    </p>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(additionalTotal)}
                    </p>
                  </div>
                )}
                <div className="rounded-xl bg-white p-3 text-xs text-gray-600 ring-1 ring-gray-200">
                  {t("tip")}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs text-gray-500">{t("calculatedFinal")}</p>
          <p className="text-lg font-bold text-gray-950">
            {formatCurrency(total || 0)}
          </p>
        </div>
        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("createOrder")}
        </Button>
      </div>
    </form>
  );
}
