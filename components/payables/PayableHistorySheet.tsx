"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useDriverPayableHistory,
  useVendorPayableHistory,
  useMarkPayablePaid,
} from "@/hooks/usePayables";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Payable, PayableHistorySummary } from "@/types";

interface Props {
  kind: "DRIVER" | "VENDOR";
  id?: string;
  name?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function SummaryCards({
  summary,
  kind,
}: {
  summary: PayableHistorySummary;
  kind: "DRIVER" | "VENDOR";
}) {
  const t = useTranslations("payables");
  const earned =
    kind === "DRIVER" ? summary.total_earned : summary.total_billed;
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
        <p className="text-[10px] font-medium uppercase text-gray-500">
          {kind === "DRIVER" ? t('totalFee') : t('totalBilled')}
        </p>
        <p className="mt-0.5 text-sm font-bold text-gray-900">
          {formatCurrency(earned ?? 0)}
        </p>
      </div>
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
        <p className="text-[10px] font-medium uppercase text-emerald-600">
          {t('paidCard')}
        </p>
        <p className="mt-0.5 text-sm font-bold text-emerald-800">
          {formatCurrency(summary.total_paid)}
        </p>
      </div>
      <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
        <p className="text-[10px] font-medium uppercase text-amber-600">
          {t('outstandingCard')}
        </p>
        <p className="mt-0.5 text-sm font-bold text-amber-800">
          {formatCurrency(summary.outstanding)}
        </p>
      </div>
    </div>
  );
}

export default function PayableHistorySheet({
  kind,
  id,
  name,
  open,
  onOpenChange,
}: Props) {
  const t = useTranslations("payables");
  const tt = useTranslations("terms");
  const driverQ = useDriverPayableHistory(
    kind === "DRIVER" && open ? id : undefined,
  );
  const vendorQ = useVendorPayableHistory(
    kind === "VENDOR" && open ? id : undefined,
  );
  const markPaid = useMarkPayablePaid();

  const data = kind === "DRIVER" ? driverQ.data : vendorQ.data;
  const isLoading = kind === "DRIVER" ? driverQ.isLoading : vendorQ.isLoading;
  const items: Payable[] = data?.items ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{t('historyTitle', { name: name || "—" })}</SheetTitle>
          <SheetDescription>
            {t('historyDesc', { role: kind === "DRIVER" ? tt('driver') : tt('vendor') })}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {data?.summary && (
            <SummaryCards summary={data.summary} kind={kind} />
          )}

          {isLoading ? (
            <p className="py-8 text-center text-sm text-gray-400">{t('loading')}</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              {t('noHistory')}
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((p) => {
                const route = [
                  p.service_item?.pickup_location,
                  p.service_item?.dropoff_location,
                ]
                  .filter(Boolean)
                  .join(" → ");
                const isPaid = p.status === "PAID";
                return (
                  <div
                    key={p.id}
                    className="rounded-lg border border-gray-100 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-900">
                            {p.service_date ? formatDate(p.service_date) : "-"}
                          </span>
                          {p.order?.order_code && (
                            <Link
                              href={`/dashboard/orders/${p.order_id}`}
                              className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:underline"
                            >
                              #{p.order.order_code}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {route || p.service_item?.description || "-"}
                        </p>
                        {(Number(p.extras_amount) !== 0 ||
                          Number(p.reimburse_amount ?? 0) !== 0 ||
                          Number(p.advance_amount ?? 0) !== 0) && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            {t('baseOthers', { base: formatCurrency(p.base_amount), others: formatCurrency(p.extras_amount) })}
                            {Number(p.reimburse_amount ?? 0) !== 0 &&
                              ` · + ${formatCurrency(p.reimburse_amount ?? 0)} ${t('reimburseShort')}`}
                            {Number(p.advance_amount ?? 0) !== 0 &&
                              ` · − ${formatCurrency(p.advance_amount ?? 0)} ${t('advanceShort')}`}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(p.total_amount)}
                        </p>
                        {isPaid ? (
                          <Badge className="mt-1 border-emerald-200 bg-emerald-50 text-emerald-700">
                            {t('paid')}
                            {p.paid_at ? ` · ${formatDate(p.paid_at)}` : ""}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="mt-1 h-7 gap-1 bg-emerald-600 text-xs hover:bg-emerald-700"
                            disabled={markPaid.isPending}
                            onClick={() =>
                              markPaid.mutate({ id: p.id, data: {} })
                            }
                          >
                            <Check className="h-3 w-3" /> {t('pay')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
