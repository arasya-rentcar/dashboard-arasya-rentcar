"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Car, Handshake, Loader2, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { describePeriod, resolvePeriod } from "@/lib/revenuePeriod";
import { useRevenuePeriod } from "@/hooks/useRevenuePeriod";
import { useRevenueReport } from "@/hooks/useAnalytics";
import PeriodToggle from "./PeriodToggle";

// Headline revenue summary for the main Dashboard. Net margin leads for both
// internal cars and vendors; "Lihat detail" links to the full report page.
export default function RevenueSummary() {
  const t = useTranslations("revenuePanels");
  const tt = useTranslations("terms");
  const tc = useTranslations("common");
  const { period } = useRevenuePeriod("dashboard");
  const range = useMemo(() => resolvePeriod(period), [period]);
  const { data, isLoading, isFetching } = useRevenueReport({
    date_from: range.date_from,
    date_to: range.date_to,
  });

  const A = data?.internal_cars.totals;
  const B = data?.vendor_margin.totals;

  return (
    <Card className="shadow-none border border-gray-200">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" /> {tt("revenue")}
            {isFetching && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            )}
          </CardTitle>
          <p className="mt-1 text-xs text-gray-400">{describePeriod(period)}</p>
        </div>
        <PeriodToggle surface="dashboard" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> {tc("loading")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Block
              icon={<Car className="h-4 w-4" />}
              title={t("internalCars")}
              netLabel={t("netMargin")}
              tripsLabel={tt("trips")}
              net={A ? A.final.net_margin : 0}
              estNet={A ? A.estimated.net_margin : 0}
              sub={[
                [tt("gross"), A ? A.final.gross : 0],
                [tt("opsCost"), A ? A.final.ops : 0],
              ]}
              trips={A?.final.trips ?? 0}
            />
            <Block
              icon={<Handshake className="h-4 w-4" />}
              title={t("vendorMargin")}
              netLabel={t("margin")}
              tripsLabel={tt("trips")}
              net={B ? B.final.arasya_margin : 0}
              estNet={B ? B.estimated.arasya_margin : 0}
              sub={[
                [t("colBilled"), B ? B.final.customer_billed : 0],
                [t("colVendorCost"), B ? B.final.vendor_cost : 0],
              ]}
              trips={B?.final.trips ?? 0}
            />
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Link
            href="/dashboard/revenue"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
          >
            {t("viewDetail")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Block({
  icon,
  title,
  netLabel,
  tripsLabel,
  net,
  estNet,
  sub,
  trips,
}: {
  icon: React.ReactNode;
  title: string;
  netLabel: string;
  tripsLabel: string;
  net: number;
  estNet: number;
  sub: [string, number][];
  trips: number;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
        {icon} {title}
      </div>
      <p className="mt-2 text-[11px] text-gray-500">{netLabel} (Final)</p>
      <p className="text-xl font-bold tabular-nums text-emerald-700">
        {formatCurrency(net)}
      </p>
      {estNet > 0 && (
        <p className="text-[11px] text-amber-600">
          + est. {formatCurrency(estNet)}
        </p>
      )}
      <div className="mt-2 space-y-1 border-t border-gray-200/70 pt-2 text-xs">
        {sub.map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <span className="text-gray-500">{label}</span>
            <span className="tabular-nums text-gray-700">
              {formatCurrency(value)}
            </span>
          </div>
        ))}
        <div className="flex justify-between">
          <span className="text-gray-500">{tripsLabel}</span>
          <span className="tabular-nums text-gray-700">{trips}</span>
        </div>
      </div>
    </div>
  );
}
