"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Car } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useExternalVendors, useExternalVendor } from "@/hooks/useExternalVendors";

export interface VendorUnitValue {
  is_external: boolean;
  external_vendor_id?: string;
  external_car_id?: string;
}

// Sprint 5 #16: choose how the order is fulfilled.
//  - Internal  : Arasya's own fleet (assigned later via Assign Driver).
//  - Vendor    : an external vendor + one of its units.
//  - Freelance : external but vendor-less (one-off, no vendor record).
export default function VendorUnitPicker({
  value,
  onChange,
  initialMode,
}: {
  value: VendorUnitValue;
  onChange: (v: VendorUnitValue) => void;
  /** Tab shown first when the value has no vendor yet (e.g. a lead for a unit we do not own). */
  initialMode?: "INTERNAL" | "VENDOR" | "FREELANCE";
}) {
  const tv = useTranslations("vendorPicker");
  const tt = useTranslations("terms");
  const [mode, setMode] = useState<"INTERNAL" | "VENDOR" | "FREELANCE">(
    initialMode ??
      (value.is_external
      ? value.external_vendor_id
        ? "VENDOR"
        : "FREELANCE"
      : "INTERNAL"),
  );

  const { data: vendorList } = useExternalVendors({
    page_size: 50,
    sort: "order_count",
    order: "desc",
  });
  const vendors = vendorList?.data ?? [];
  const { data: vendorDetail } = useExternalVendor(
    value.external_vendor_id ?? "",
    { cars_page: 1 },
  );
  const cars = vendorDetail?.cars ?? [];

  function pickMode(m: "INTERNAL" | "VENDOR" | "FREELANCE") {
    setMode(m);
    if (m === "INTERNAL")
      onChange({ is_external: false });
    else if (m === "FREELANCE")
      onChange({ is_external: true });
    else onChange({ is_external: true, external_vendor_id: undefined });
  }

  const tabs: { key: typeof mode; label: string }[] = [
    { key: "INTERNAL", label: tt("internal") },
    { key: "VENDOR", label: tt("vendor") },
    { key: "FREELANCE", label: tt("freelance") },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 lg:p-5 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-950">{tv("title")}</h3>
        <p className="mt-1 text-xs text-gray-500">
          {tv("hint")}
        </p>
      </div>

      <div className="inline-flex rounded-lg bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => pickMode(t.key)}
            className={
              mode === t.key
                ? "rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-900 shadow-sm"
                : "rounded-md px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === "VENDOR" && (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> {tt("vendor")}
            </Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={value.external_vendor_id ?? ""}
              onChange={(e) =>
                onChange({
                  is_external: true,
                  external_vendor_id: e.target.value || undefined,
                  external_car_id: undefined,
                })
              }
            >
              <option value="">{tv("selectVendor")}</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5" /> {tt("unit")}
            </Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              value={value.external_car_id ?? ""}
              disabled={!value.external_vendor_id}
              onChange={(e) =>
                onChange({
                  ...value,
                  is_external: true,
                  external_car_id: e.target.value || undefined,
                })
              }
            >
              <option value="">
                {value.external_vendor_id
                  ? cars.length
                    ? tv("selectUnit")
                    : tv("vendorNoUnit")
                  : tv("selectVendorFirst")}
              </option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.model}
                  {c.plate_number ? ` · ${c.plate_number}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {mode === "FREELANCE" && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {tv("freelanceNote")}
        </p>
      )}
    </section>
  );
}
