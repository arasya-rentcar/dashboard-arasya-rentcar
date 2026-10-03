"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Phone, Mail, MapPin, CreditCard } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PartnerDetailView from "@/components/partners/PartnerDetailView";
import DriverAppAccessCard from "@/components/drivers/DriverAppAccessCard";
import { useDriverDetail } from "@/hooks/useDrivers";

export default function DriverDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const t = useTranslations("driverDetail");
  const tt = useTranslations("terms");
  const { data, isLoading } = useDriverDetail(id);

  if (isLoading) {
    return (
      <DashboardShell title={t('title')}>
        <p className="text-sm text-gray-400">{t('loading')}</p>
      </DashboardShell>
    );
  }
  if (!data) {
    return (
      <DashboardShell title={t('title')}>
        <p className="text-sm text-gray-400">{t('notFound')}</p>
      </DashboardShell>
    );
  }

  const d = data.driver;

  return (
    <DashboardShell title={d.name}>
      <div className="space-y-5">
        <Link
          href="/dashboard/drivers"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> {t('backToDrivers')}
        </Link>

        {/* Header */}
        <Card className="border border-gray-200 shadow-none">
          <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-2 p-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-gray-900">{d.name}</p>
                <Badge
                  variant="outline"
                  className={
                    d.type === "INTERNAL"
                      ? "text-xs bg-blue-50 text-blue-700 border-blue-200"
                      : "text-xs bg-purple-50 text-purple-700 border-purple-200"
                  }
                >
                  {d.type === "INTERNAL" ? tt('internal') : tt('external')}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                {d.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {d.phone}
                  </span>
                )}
                {d.user?.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> {d.user.email}
                  </span>
                )}
                {d.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {d.location}
                  </span>
                )}
                {d.etoll_card && (
                  <span className="flex items-center gap-1.5" title={t('etollCard')}>
                    <CreditCard className="h-3.5 w-3.5" /> {t('etollCard')}: {d.etoll_card}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <DriverAppAccessCard driverId={d.id} phone={d.phone} />

        <PartnerDetailView
          kind="DRIVER"
          summary={data.summary}
          trips={data.trips}
          payments={data.payments}
        />
      </div>
    </DashboardShell>
  );
}
