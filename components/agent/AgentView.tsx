"use client";

import { useTranslations } from "next-intl";
import { Bot, Brain, ClipboardList, MapPin, Car, Users } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return <section className="min-w-0 break-words rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"><div className="mb-3 flex items-center gap-2"><div className="rounded-lg bg-gray-900 p-2 text-white"><Icon className="h-4 w-4" /></div><h2 className="text-base font-semibold text-gray-900">{title}</h2></div>{children}</section>;
}

interface Props {
  decisions: any[];
  lessons: any[];
  drivers: any[];
  areas: any[];
  cars: any[];
  orderLessons: any[];
  reportLessons: any[];
}

export default function AgentView({
  decisions,
  lessons,
  drivers,
  areas,
  cars,
  orderLessons,
  reportLessons,
}: Props) {
  const t = useTranslations("agentPage");
  const empty = <p className="text-sm text-gray-500">{t("noData")}</p>;

  return <DashboardShell title={t('title')}>
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="rounded-2xl bg-gray-900 p-5 text-white sm:p-6">
        <p className="text-sm text-gray-300">{t('subtitle')}</p>
        <h2 className="mt-1 text-xl font-semibold sm:text-2xl">{t('heading')}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">{t('intro')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-gray-500">{t('decisions')}</div><div className="text-2xl font-semibold">{decisions.length}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-gray-500">{t('lessons')}</div><div className="text-2xl font-semibold">{lessons.length + orderLessons.length + reportLessons.length}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-gray-500">{t('aliases')}</div><div className="text-2xl font-semibold">{drivers.length + areas.length + cars.length}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-gray-500">{t('wakeKeywords')}</div><div className="mt-1 break-words font-mono text-sm">#order #start #drop #finish</div></div>
      </div>

      <Card title={t('recentDecisionLog')} icon={ClipboardList}>
        {decisions.length ? <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-3">{t('colTime')}</th><th className="p-3">{t('colSkill')}</th><th className="p-3">{t('colAction')}</th><th className="p-3">{t('colStatus')}</th><th className="p-3">{t('colSummary')}</th></tr></thead><tbody className="divide-y">{decisions.map((d)=><tr key={d.id}><td className="whitespace-nowrap p-3 text-xs text-gray-500">{d.ts}</td><td className="p-3 font-medium">{d.skill || d.intent}</td><td className="p-3">{d.action}</td><td className="p-3">{d.status}</td><td className="p-3 text-gray-700">{d.summary || d.reason || "-"}{d.order_code ? <div className="text-xs text-gray-500">{t('orderLabel', { code: d.order_code })}</div> : null}</td></tr>)}</tbody></table></div> : empty}
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title={t('driverAliases')} icon={Users}>{drivers.length ? <ul className="space-y-2 text-sm">{drivers.map((a,i)=><li key={i} className="rounded-lg border p-3"><b>{a.alias}</b> → {a.value}<div className="text-xs text-gray-500">{a.source || "agent"}</div></li>)}</ul> : empty}</Card>
        <Card title={t('areaAliases')} icon={MapPin}>{areas.length ? <ul className="space-y-2 text-sm">{areas.map((a,i)=><li key={i} className="rounded-lg border p-3"><b>{a.alias}</b> → {a.value}<div className="text-xs text-gray-500">{a.source || "agent"}</div></li>)}</ul> : empty}</Card>
        <Card title={t('carAliases')} icon={Car}>{cars.length ? <ul className="space-y-2 text-sm">{cars.map((a,i)=><li key={i} className="rounded-lg border p-3"><b>{a.alias}</b> → {a.value}<div className="text-xs text-gray-500">{a.source || "agent"}</div></li>)}</ul> : empty}</Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={t('agentLessons')} icon={Brain}>{lessons.length ? <ul className="space-y-2 text-sm">{lessons.map((l)=><li key={l.id || l.ts} className="rounded-lg border p-3"><b>{l.type}</b><p className="mt-1 text-gray-700">{l.rule || l.summary || JSON.stringify(l)}</p></li>)}</ul> : empty}</Card>
        <Card title={t('parserFailures')} icon={Bot}><div className="space-y-4"><div><b className="text-sm">{t('orderParser')}</b>{orderLessons.length ? <ul className="mt-2 space-y-2 text-sm">{orderLessons.map((l,i)=><li key={i} className="rounded-lg border p-3">{l.reason || l.summary || JSON.stringify(l)}</li>)}</ul> : empty}</div><div><b className="text-sm">{t('reportParser')}</b>{reportLessons.length ? <ul className="mt-2 space-y-2 text-sm">{reportLessons.map((l,i)=><li key={i} className="rounded-lg border p-3">{l.reason || l.summary || JSON.stringify(l)}</li>)}</ul> : empty}</div></div></Card>
      </div>
    </div>
  </DashboardShell>;
}
