"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
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
interface Props {
  onSubmit: (data: any) => Promise<void>;
  isLoading: boolean;
}
function iso(v?: string) {
  return v ? new Date(v).toISOString() : undefined;
}
function dateIso(v?: string) {
  return v ? new Date(`${v}T00:00:00`).toISOString() : undefined;
}
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

const ADDITIONAL_TYPES: { label: string; value: string }[] = [
  { label: "Overtime", value: "OVERTIME" },
  { label: "Parkir", value: "PARKING" },
  { label: "Toll", value: "TOLL" },
  { label: "Additional", value: "OTHER" },
];

export default function CreateOrderForm({ onSubmit, isLoading }: Props) {
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
      customers: [{ name: "", phone: "", is_primary: true }],
      service_items: [defaultItem],
      additionals: [],
      notes: "",
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
          ADDITIONAL_TYPES.find((t) => t.value === a.type)?.label ||
          "Additional",
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
      service_items: values.service_items.map((item, index) => ({
        service_date: dateIso(item.service_date),
        start_at: iso(item.start_at),
        end_at: iso(item.end_at),
        description: item.description || undefined,
        service_kind: item.service_kind || undefined,
        service_package: item.service_package || undefined,
        pickup_location: item.pickup_location,
        dropoff_location: item.dropoff_location,
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || 0),
        total_price: Number(item.quantity || 1) * Number(item.unit_price || 0),
        notes: item.notes || undefined,
        sort_order: index,
      })),
      additionals: cleanAdditionals,
    });
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="flex h-[calc(96vh-92px)] min-h-[620px] flex-col overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5 min-w-0">
            <section className="rounded-2xl border border-gray-200 bg-white p-4 lg:p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-950">
                    Customer / PIC
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Add all customer contacts. Mark one as primary.
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
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add PIC
                </Button>
              </div>
              <div className="mb-4">
                <Label className="mb-1.5 block text-xs text-gray-500">
                  Customer lama (opsional)
                </Label>
                <CustomerPicker
                  selected={masterCustomer}
                  onSelect={selectMaster}
                  onClear={() => setMasterCustomer(null)}
                />
                {masterCustomer && (
                  <p className="mt-1.5 text-[11px] text-emerald-600">
                    PIC utama dikunci ke customer ini. Order akan tercatat ke
                    profil yang sama.
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
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Name</Label>
                        <Input
                          placeholder="Customer / PIC name"
                          {...register(`customers.${index}.name`)}
                        />
                        {errors.customers?.[index]?.name && (
                          <p className="text-xs text-red-500">
                            {errors.customers[index]?.name?.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <Input
                          placeholder="WhatsApp number"
                          {...register(`customers.${index}.phone`)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs leading-5 text-gray-600 shadow-sm">
              Order Date / Booking Time is saved automatically when the order is
              created. Fill <b>Day 1</b> in the first Service Detail row below.
              For a 1-day rental, the admin only needs to complete that first
              row once.
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
                    Additional Charges
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Optional. Add if known upfront (overtime, parkir, etc.).
                    Otherwise add later from the order detail page. Amount in
                    Rupiah.
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
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Additional
                </Button>
              </div>
              {additionalFields.length === 0 ? (
                <p className="text-xs text-gray-400">
                  No additional charges added.
                </p>
              ) : (
                <div className="space-y-3">
                  {additionalFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 md:grid-cols-[160px_minmax(0,1fr)_160px_40px] md:items-end"
                    >
                      <div className="space-y-1.5">
                        <Label>Type</Label>
                        <select
                          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          {...register(`additionals.${index}.type`)}
                        >
                          {ADDITIONAL_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Label / Note</Label>
                        <Input
                          placeholder="e.g. Overtime 2 jam"
                          {...register(`additionals.${index}.description`)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Amount (Rp)</Label>
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
                <Label>Notes (Keterangan)</Label>
                <Textarea
                  rows={2}
                  placeholder="Extra notes for this order"
                  {...register("notes")}
                />
              </div>
            </section>
          </div>

          <aside className="hidden lg:block min-w-0">
            <div className="sticky top-0 space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Order Summary
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-950">
                  {formatCurrency(total || 0)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Service lines + additional charges.
                </p>
              </div>
              <div className="space-y-3 border-t border-gray-200 pt-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Primary PIC</p>
                  <p className="font-medium text-gray-900">
                    {primary?.name || "Not filled yet"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {primary?.phone || "No phone yet"}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Service Rows ({items?.length || 0})
                  </p>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(lineTotal || 0)}
                  </p>
                </div>
                {additionalTotal > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Additional ({additionalFields.length})
                    </p>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(additionalTotal)}
                    </p>
                  </div>
                )}
                <div className="rounded-xl bg-white p-3 text-xs text-gray-600 ring-1 ring-gray-200">
                  Tip: use one row per day, route, extra stop, overtime, or
                  different price.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs text-gray-500">Calculated final price</p>
          <p className="text-lg font-bold text-gray-950">
            {formatCurrency(total || 0)}
          </p>
        </div>
        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create
          Order
        </Button>
      </div>
    </form>
  );
}
