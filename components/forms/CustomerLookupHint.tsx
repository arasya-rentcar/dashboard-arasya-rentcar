"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck, History, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomerLookup } from "@/hooks/useCustomers";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatDate } from "@/lib/utils";
import type { Customer, CustomerLookupResult } from "@/types";

// A returning customer is recognised by the phone typed for the primary PIC.
// The lookup only runs once the number looks complete (>= 10 digits) and the
// typing has settled, and never while a master customer is already locked.
export function lookupToCustomer(r: CustomerLookupResult): Customer {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email ?? null,
    tags: [],
    total_orders: r.total_orders,
    total_spent: 0,
    last_order_at: r.last_order_at ?? null,
    company_name: r.company_name ?? null,
    has_ktp: r.has_ktp,
    verified: r.verified,
    id_number_masked: r.id_number_masked ?? null,
    created_at: "",
    updated_at: "",
  };
}

export default function CustomerLookupHint({
  phone,
  locked,
  onUse,
}: {
  phone?: string | null;
  locked: boolean;
  onUse: (c: Customer) => void;
}) {
  const t = useTranslations("customerLookup");
  const digits = (phone ?? "").replace(/\D/g, "");
  const debounced = useDebouncedValue(digits, 400);
  // `digits !== debounced` hides a stale hint while the user is still typing.
  const ready = !locked && debounced.length >= 10 && digits === debounced;
  const { data: found } = useCustomerLookup(ready ? (phone ?? "").trim() : undefined);

  if (!ready || !found) return null;
  const complete = found.has_ktp && found.verified;

  return (
    <div
      className={`mb-4 rounded-xl border px-3 py-2.5 ${
        complete
          ? "border-emerald-200 bg-emerald-50/70"
          : "border-amber-200 bg-amber-50/70"
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm text-gray-800">
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <History className="h-4 w-4 shrink-0 text-gray-500" />
            <span className="font-medium">
              {t("returning", { name: found.name })}
            </span>
            <span className="text-gray-600">
              · {t("orders", { count: found.total_orders })}
              {found.last_order_at
                ? ` · ${t("last", { date: formatDate(found.last_order_at) })}`
                : ""}
              {found.company_name ? ` · ${found.company_name}` : ""}
            </span>
          </p>
          <p className="ml-5.5 mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
            {found.has_ktp ? (
              <span className="text-emerald-700">{t("ktpOk")}</span>
            ) : null}
            {found.verified ? (
              <span className="inline-flex items-center gap-0.5 text-emerald-700">
                <BadgeCheck className="h-3 w-3" /> {t("verified")}
              </span>
            ) : null}
            {!found.has_ktp || !found.verified ? (
              <span className="inline-flex items-center gap-0.5 text-amber-800">
                <ShieldAlert className="h-3 w-3" />
                {found.has_ktp ? t("notVerified") : t("noKtp")}
              </span>
            ) : null}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 bg-white"
          onClick={() => onUse(lookupToCustomer(found))}
        >
          {t("use")}
        </Button>
      </div>
    </div>
  );
}
