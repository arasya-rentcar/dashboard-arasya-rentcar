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
import { z } from "zod";
import { MapPin, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MapPointLink from "@/components/dashboard/MapPointLink";
import { formatCurrency } from "@/lib/utils";
import { itemDropoffPoint, itemPickupPoint, type GeoPoint } from "@/lib/maps";

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
  // Map points (from the website lead). Not editable here yet; cleared when
  // the matching address text is edited so text and point never disagree.
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  pickup_place_id?: string | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  dropoff_place_id?: string | null;
}

// Zod shape for the point fields: the form schemas must list them, or the
// resolver strips them before submit.
export const servicePointFieldsSchema = {
  pickup_lat: z.number().nullable().optional(),
  pickup_lng: z.number().nullable().optional(),
  pickup_place_id: z.string().nullable().optional(),
  dropoff_lat: z.number().nullable().optional(),
  dropoff_lng: z.number().nullable().optional(),
  dropoff_place_id: z.string().nullable().optional(),
};

/** Form values for a row's points (null when there is none). */
export function pointFormValues(
  pickup?: GeoPoint | null,
  dropoff?: GeoPoint | null,
) {
  return {
    pickup_lat: pickup?.lat ?? null,
    pickup_lng: pickup?.lng ?? null,
    pickup_place_id: pickup?.placeId ?? null,
    dropoff_lat: dropoff?.lat ?? null,
    dropoff_lng: dropoff?.lng ?? null,
    dropoff_place_id: dropoff?.placeId ?? null,
  };
}

interface Props<T extends { service_items: ServiceItemFormValue[] }> {
  control: Control<T>;
  register: UseFormRegister<T>;
  setValue: UseFormSetValue<T>;
  watch: UseFormWatch<T>;
  errors: FieldErrors<T>;
}

// Auto drop-off placeholder from service_kind, mirroring the WA bot rule.
// Inputs/outputs are `datetime-local` strings ("YYYY-MM-DDTHH:mm") which the
// admin reads as WIB wall-clock. The real finish still comes from the driver
// report; this only pre-fills an empty Dropoff Time.
//   12H      -> pickup + 12h (may cross midnight)
//   FULLDAY  -> 23:00 same day as pickup
//   DROP     -> 23:00 same day as pickup
export function computeAutoEnd(
  startLocal: string,
  serviceKind?: string,
): string {
  if (!serviceKind) return "";
  const m = String(startLocal || "").match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/,
  );
  if (serviceKind === "FULLDAY" || serviceKind === "DROP") {
    if (!m) return "";
    return `${m[1]}-${m[2]}-${m[3]}T23:00`;
  }
  if (serviceKind === "12H") {
    if (!m) return "";
    // Treat the local wall-clock as UTC purely for +12h arithmetic, then read
    // the same fields back — no timezone shift, just date/clock rollover.
    const d = new Date(
      Date.UTC(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
      ) +
        12 * 3600 * 1000,
    );
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(
      d.getUTCDate(),
    )}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
  }
  return "";
}

function newItem(): ServiceItemFormValue {
  return {
    service_date: "",
    start_at: "",
    end_at: "",
    description: "",
    service_kind: "12H",
    service_package: "ALL-IN X PARKIR",
    pickup_location: "",
    dropoff_location: "",
    quantity: "1",
    unit_price: "",
    notes: "",
    ...pointFormValues(null, null),
  };
}

export default function OrderServiceItemsEditor<
  T extends { service_items: ServiceItemFormValue[] },
>({ control, register, setValue, watch, errors }: Props<T>) {
  const t = useTranslations("serviceItems");
  const tm = useTranslations("maps");
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

  const rowErrors = (index: number) =>
    (errors as FieldErrors<{ service_items: ServiceItemFormValue[] }>)
      .service_items?.[index];
  // Native selects match the Input height and use 16px text on phones (no
  // iOS zoom on focus), like Input does.
  const selectClass =
    "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-xs md:text-sm";

  function clearPoint(index: number, side: "pickup" | "dropoff") {
    for (const f of ["lat", "lng", "place_id"]) {
      setValue(`service_items.${index}.${side}_${f}` as never, null as never, {
        shouldDirty: true,
      });
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/70 px-3 py-3 sm:px-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {t("title")}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {t("desc")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-right">
            <p className="text-[10px] uppercase tracking-wide text-emerald-700">
              {t("finalPrice")}
            </p>
            <p className="text-sm font-bold text-emerald-800 tabular-nums">
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
          const err = rowErrors(index);
          const id = (name: string) => `si-${field.id}-${name}`;
          const pickupPoint = itemPickupPoint(items?.[index]);
          const dropoffPoint = itemDropoffPoint(items?.[index]);
          return (
            <div key={field.id} className="bg-white p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
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
                    <p className="text-sm font-semibold text-gray-900 tabular-nums">
                      {formatCurrency(lineTotal)}
                    </p>
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(index)}
                      className="text-red-500 hover:text-red-600"
                      aria-label={t("removeRow", { n: index + 1 })}
                      title={t("removeRow", { n: index + 1 })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
                <div className="space-y-1.5 xl:col-span-2">
                  <Label htmlFor={id("date")}>{t("serviceDate")}</Label>
                  <Input
                    id={id("date")}
                    type="date"
                    {...register(
                      `service_items.${index}.service_date` as never,
                    )}
                  />
                </div>
                <div className="space-y-1.5 xl:col-span-2">
                  <Label htmlFor={id("kind")}>{t("durasi")}</Label>
                  <select
                    id={id("kind")}
                    className={selectClass}
                    {...register(
                      `service_items.${index}.service_kind` as never,
                      {
                        onChange: (e) => {
                          const kind = e.target.value as string;
                          const start = (items?.[index]?.start_at ||
                            "") as string;
                          const end = (items?.[index]?.end_at || "") as string;
                          // Only auto-fill when admin hasn't set a finish time.
                          if (!end) {
                            const auto = computeAutoEnd(start, kind);
                            if (auto)
                              setValue(
                                `service_items.${index}.end_at` as never,
                                auto as never,
                                { shouldDirty: true },
                              );
                          }
                        },
                      },
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
                  <Label htmlFor={id("package")}>{t("paket")}</Label>
                  <select
                    id={id("package")}
                    className={selectClass}
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
                  <Label htmlFor={id("desc")}>{t("description")}</Label>
                  <Input
                    id={id("desc")}
                    placeholder={t("descriptionPlaceholder")}
                    {...register(`service_items.${index}.description` as never)}
                  />
                </div>
                <div className="space-y-1.5 xl:col-span-3">
                  <Label htmlFor={id("pickup")}>{t("pickup")}</Label>
                  <Input
                    id={id("pickup")}
                    placeholder={t("pickupPlaceholder")}
                    aria-invalid={!!err?.pickup_location}
                    {...register(
                      `service_items.${index}.pickup_location` as never,
                      {
                        // Typing a different address drops the website point.
                        onChange: () => {
                          if (pickupPoint) clearPoint(index, "pickup");
                        },
                      },
                    )}
                  />
                  {err?.pickup_location && (
                    <p className="text-xs text-red-500">{t("fieldRequired")}</p>
                  )}
                  {pickupPoint && (
                    <PointChip
                      point={pickupPoint}
                      label={tm("pickupPoint")}
                      removeLabel={tm("removePickupPoint")}
                      onRemove={() => clearPoint(index, "pickup")}
                    />
                  )}
                </div>
                <div className="space-y-1.5 xl:col-span-3">
                  <Label htmlFor={id("dropoff")}>{t("dropoff")}</Label>
                  <Input
                    id={id("dropoff")}
                    placeholder={t("dropoffPlaceholder")}
                    aria-invalid={!!err?.dropoff_location}
                    {...register(
                      `service_items.${index}.dropoff_location` as never,
                      {
                        onChange: () => {
                          if (dropoffPoint) clearPoint(index, "dropoff");
                        },
                      },
                    )}
                  />
                  {err?.dropoff_location && (
                    <p className="text-xs text-red-500">{t("fieldRequired")}</p>
                  )}
                  {dropoffPoint && (
                    <PointChip
                      point={dropoffPoint}
                      label={tm("destinationPoint")}
                      removeLabel={tm("removeDropoffPoint")}
                      onRemove={() => clearPoint(index, "dropoff")}
                    />
                  )}
                </div>

                <div className="space-y-1.5 xl:col-span-3">
                  <Label htmlFor={id("start")}>{t("pickupTime")}</Label>
                  <Input
                    id={id("start")}
                    type="datetime-local"
                    step={60}
                    {...register(`service_items.${index}.start_at` as never, {
                      onChange: (e) => {
                        const start = e.target.value as string;
                        const kind = (items?.[index]?.service_kind ||
                          "") as string;
                        const end = (items?.[index]?.end_at || "") as string;
                        if (!end) {
                          const auto = computeAutoEnd(start, kind);
                          if (auto)
                            setValue(
                              `service_items.${index}.end_at` as never,
                              auto as never,
                              { shouldDirty: true },
                            );
                        }
                      },
                    })}
                  />
                </div>
                <div className="space-y-1.5 xl:col-span-3">
                  <Label htmlFor={id("end")}>{t("dropoffTime")}</Label>
                  <Input
                    id={id("end")}
                    type="datetime-local"
                    step={60}
                    {...register(`service_items.${index}.end_at` as never)}
                  />
                </div>
                <div className="space-y-1.5 xl:col-span-2">
                  <Label htmlFor={id("qty")}>{t("qtyDays")}</Label>
                  <Input
                    id={id("qty")}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    aria-invalid={!!err?.quantity}
                    {...register(`service_items.${index}.quantity` as never)}
                  />
                  {err?.quantity && (
                    <p className="text-xs text-red-500">{t("fieldRequired")}</p>
                  )}
                </div>
                <div className="space-y-1.5 xl:col-span-2">
                  <Label htmlFor={id("price")}>{t("unitPrice")}</Label>
                  <Input
                    id={id("price")}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    aria-invalid={!!err?.unit_price}
                    {...register(`service_items.${index}.unit_price` as never)}
                  />
                  {err?.unit_price && (
                    <p className="text-xs text-red-500">{t("fieldRequired")}</p>
                  )}
                </div>
                <div className="space-y-1.5 sm:col-span-2 xl:col-span-2">
                  <Label htmlFor={id("notes")}>{t("notes")}</Label>
                  <Input
                    id={id("notes")}
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

// Shows that a map point is attached to the address above it: the text links
// to the map, "x" removes the point (picking a new point comes later).
function PointChip({
  point,
  label,
  removeLabel,
  onRemove,
}: {
  point: GeoPoint;
  label: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  const t = useTranslations("maps");
  return (
    <div
      className="inline-flex max-w-full items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 py-0.5 pl-2 pr-0.5 text-[11px] text-emerald-800"
      title={t("pointHint")}
    >
      <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
      {/* The chip text itself opens the point on the map. */}
      <MapPointLink point={point} label={label} className="min-w-0 font-medium">
        <span className="sr-only">{label}: </span>
        <span className="truncate">{t("pointFromWebsite")}</span>
      </MapPointLink>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        title={removeLabel}
        className="flex h-6 w-6 items-center justify-center rounded text-emerald-700 hover:bg-emerald-100 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
