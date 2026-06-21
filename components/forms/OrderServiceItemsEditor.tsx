"use client";

import { useTranslations } from "next-intl";
import {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
  useFieldArray,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

// DURASI (sheet column) -> stored value
export const DURASI_OPTIONS: { label: string; value: string }[] = [
  { label: "12 Jam", value: "12H" },
  { label: "Fullday", value: "FULLDAY" },
  { label: "Drop Only", value: "DROP" },
];

// PAKET / LAYANAN (sheet column) -> stored value
export const PAKET_OPTIONS: { label: string; value: string }[] = [
  { label: "All Include", value: "ALL-IN" },
  { label: "X Parkir", value: "ALL-IN X PARKIR" },
  { label: "X Ops", value: "XOPS" },
];

export interface ServiceItemFormValue {
  service_date?: string;
  start_at?: string;
  end_at?: string;
  description?: string;
  service_kind?: string;
  service_package?: string;
  pickup_location: string;
  dropoff_location: string;
  quantity: string;
  unit_price: string;
  notes?: string;
}

interface Props<T extends { service_items: ServiceItemFormValue[] }> {
  control: Control<T>;
  register: UseFormRegister<T>;
  setValue: UseFormSetValue<T>;
  watch: UseFormWatch<T>;
  errors: FieldErrors<T>;
}

function newItem(): ServiceItemFormValue {
  return {
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
}

export default function OrderServiceItemsEditor<
  T extends { service_items: ServiceItemFormValue[] },
>({ control, register, setValue, watch, errors }: Props<T>) {
  const t = useTranslations("serviceItems");
  const { fields, append, remove } = useFieldArray({
    control,
    name: "service_items" as never,
  });
  const items = watch(
    "service_items" as never,
  ) as unknown as ServiceItemFormValue[];
  const total = (items || []).reduce(
    (sum, item) =>
      sum + Number(item.quantity || 1) * Number(item.unit_price || 0),
    0,
  );

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/70 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <Label className="text-sm font-semibold text-gray-900">
            {t("title")}
          </Label>
          <p className="mt-0.5 text-xs text-gray-500">
            {t("desc")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-right">
            <p className="text-[10px] uppercase tracking-wide text-emerald-700">
              {t("finalPrice")}
            </p>
            <p className="text-sm font-bold text-emerald-800">
              {formatCurrency(total)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(newItem() as never)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> {t("addRow")}
          </Button>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {fields.map((field, index) => {
          const lineTotal =
            Number(items?.[index]?.quantity || 1) *
            Number(items?.[index]?.unit_price || 0);
          return (
            <div key={field.id} className="bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold text-gray-900">
                    {t("serviceRow")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-gray-50 px-3 py-1 text-right">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">
                      {t("lineTotal")}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(lineTotal)}
                    </p>
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
                <div className="space-y-1.5 xl:col-span-2">
                  <Label>{t("serviceDate")}</Label>
                  <Input
                    type="date"
                    {...register(
                      `service_items.${index}.service_date` as never,
                    )}
                  />
                </div>
                <div className="space-y-1.5 xl:col-span-2">
                  <Label>{t("durasi")}</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    {...register(
                      `service_items.${index}.service_kind` as never,
                    )}
                  >
                    {DURASI_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 xl:col-span-2">
                  <Label>{t("paket")}</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    {...register(
                      `service_items.${index}.service_package` as never,
                    )}
                  >
                    {PAKET_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 xl:col-span-2">
                  <Label>{t("description")}</Label>
                  <Input
                    placeholder={t("descriptionPlaceholder")}
                    {...register(`service_items.${index}.description` as never)}
                  />
                </div>
                <div className="space-y-1.5 xl:col-span-3">
                  <Label>{t("pickup")}</Label>
                  <Input
                    placeholder={t("pickupPlaceholder")}
                    {...register(
                      `service_items.${index}.pickup_location` as never,
                    )}
                  />
                </div>
                <div className="space-y-1.5 xl:col-span-3">
                  <Label>{t("dropoff")}</Label>
                  <Input
                    placeholder={t("dropoffPlaceholder")}
                    {...register(
                      `service_items.${index}.dropoff_location` as never,
                    )}
                  />
                </div>

                <div className="space-y-1.5 xl:col-span-3">
                  <Label>{t("pickupTime")}</Label>
                  <Input
                    type="datetime-local"
                    step={60}
                    {...register(`service_items.${index}.start_at` as never)}
                  />
                </div>
                <div className="space-y-1.5 xl:col-span-3">
                  <Label>{t("dropoffTime")}</Label>
                  <Input
                    type="datetime-local"
                    step={60}
                    {...register(`service_items.${index}.end_at` as never)}
                  />
                </div>
                <div className="space-y-1.5 xl:col-span-2">
                  <Label>{t("qtyDays")}</Label>
                  <Input
                    type="number"
                    min="1"
                    {...register(`service_items.${index}.quantity` as never)}
                  />
                </div>
                <div className="space-y-1.5 xl:col-span-2">
                  <Label>{t("unitPrice")}</Label>
                  <Input
                    type="number"
                    min="0"
                    {...register(`service_items.${index}.unit_price` as never)}
                  />
                </div>
                <div className="space-y-1.5 xl:col-span-2">
                  <Label>{t("notes")}</Label>
                  <Input
                    placeholder={t("notesPlaceholder")}
                    {...register(`service_items.${index}.notes` as never)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
