"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  FileText,
  Handshake,
  HelpCircle,
  LayoutGrid,
  MousePointerClick,
  ShieldAlert,
  Smartphone,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import DashboardShell from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: ReactNode;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="shrink-0 rounded-lg bg-gray-900 p-2 text-white">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="min-w-0 break-words text-base font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Item({ title, body, tone = "plain" }: { title: ReactNode; body: ReactNode; tone?: "plain" | "warn" }) {
  return (
    <div
      className={
        tone === "warn"
          ? "min-w-0 break-words rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950"
          : "min-w-0 break-words rounded-lg border p-3"
      }
    >
      <b className="text-gray-900">{title}</b>
      <p className="mt-1">{body}</p>
    </div>
  );
}

export default function GuidePage() {
  const t = useTranslations("guide");
  const nav = useTranslations("nav");

  // Menu and group names come from the sidebar labels so the guide never
  // drifts from what the admin actually sees.
  const values = {
    groupOverview: nav("groupOverview"),
    groupSales: nav("groupSales"),
    groupOperations: nav("groupOperations"),
    groupFinance: nav("groupFinance"),
    groupHelp: nav("groupHelp"),
    menuDashboard: nav("dashboard"),
    menuNotifications: nav("notifications"),
    menuLeads: nav("leads"),
    menuOrders: nav("orders"),
    menuCustomers: nav("customers"),
    menuPriceList: nav("priceList"),
    menuTrip: nav("schedule"),
    menuDrivers: nav("drivers"),
    menuUnits: nav("cars"),
    menuEtoll: nav("etollCards"),
    menuVendors: nav("external"),
    menuInvoices: nav("invoices"),
    menuPayables: nav("payables"),
    menuRevenue: nav("revenue"),
    menuGuide: nav("guide"),
  };
  const rich = (key: string) =>
    t.rich(key, {
      ...values,
      b: (chunks) => <b className="font-semibold">{chunks}</b>,
    });
  // Message arrays are rendered entry by entry so each one gets the values above.
  const keysOf = (key: string) =>
    (t.raw(key) as unknown[]).map((_, i) => `${key}.${i}`);
  const items = (key: string, tone?: "plain" | "warn") =>
    keysOf(key).map((k) => (
      <Item key={k} title={rich(`${k}.t`)} body={rich(`${k}.d`)} tone={tone} />
    ));

  return (
    <DashboardShell title={t("title")}>
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-2xl bg-gray-900 p-5 text-white sm:p-6">
          <p className="text-sm text-gray-300">{t("heroKicker")}</p>
          <h2 className="mt-1 break-words text-xl font-semibold sm:text-2xl">
            {t("heroTitle")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
            {t("heroSubtitle")}
          </p>
        </div>

        <Card title={t("dailyFlowTitle")} icon={CheckCircle2}>
          <ol className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
            {keysOf("steps").map((k, i) => (
              <li key={k} className="flex min-w-0 gap-2">
                <span className="shrink-0 font-semibold text-gray-900">{i + 1}.</span>
                <span className="min-w-0 break-words">{rich(k)}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card title={t("menuTitle")} icon={LayoutGrid}>
          <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2 lg:grid-cols-3">
            {items("menuGroups")}
          </div>
        </Card>

        <Card title={t("leadsTitle")} icon={MousePointerClick}>
          <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
            {items("leadsItems")}
          </div>
        </Card>

        <Card title={t("tripsTitle")} icon={CalendarDays}>
          <div className="space-y-3 text-sm text-gray-700">
            <p>{t("tripsIntro")}</p>
            <div className="grid gap-2 md:grid-cols-2">{items("tripsItems")}</div>
          </div>
        </Card>

        <Card title={t("invoiceTitle")} icon={FileText}>
          <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
            {items("invoiceItems")}
          </div>
        </Card>

        <Card title={t("driverAppTitle")} icon={Smartphone}>
          <div className="space-y-3 text-sm text-gray-700">
            <p>{t("driverAppIntro")}</p>
            <div className="grid gap-2 md:grid-cols-2">{items("driverAppItems")}</div>
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title={t("customersTitle")} icon={UserRound}>
            <div className="space-y-2 text-sm text-gray-700">{items("customersItems")}</div>
          </Card>

          <Card title={t("partnersTitle")} icon={Handshake}>
            <div className="space-y-2 text-sm text-gray-700">{items("partnersItems")}</div>
          </Card>
        </div>

        <Card title={t("financeTitle")} icon={Wallet}>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="grid gap-2 md:grid-cols-2">{items("financeItems")}</div>
            <Button asChild variant="outline" className="h-auto min-h-9 whitespace-normal">
              <Link href="/dashboard/price-list">{rich("priceListLink")}</Link>
            </Button>
          </div>
        </Card>

        <Card title={t("rulesTitle")} icon={ShieldAlert}>
          <div className="grid gap-2 text-sm md:grid-cols-2">{items("rules", "warn")}</div>
        </Card>

        <Card title={t("mistakesTitle")} icon={HelpCircle}>
          <ul className="space-y-2 text-sm text-gray-700">
            {keysOf("mistakes").map((k) => (
              <li key={k} className="flex min-w-0 gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span className="min-w-0 break-words">{rich(k)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </DashboardShell>
  );
}
