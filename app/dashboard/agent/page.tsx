import fs from "fs";
import path from "path";
import { Bot, Brain, ClipboardList, MapPin, Car, Users } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";

export const dynamic = "force-dynamic";

const AGENT_DIR = "/root/.openclaw/workspace/wa-bot-arasya/data/agent";

function readJson<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(AGENT_DIR, name), "utf8"));
  } catch {
    return fallback;
  }
}

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="mb-3 flex items-center gap-2"><div className="rounded-lg bg-gray-900 p-2 text-white"><Icon className="h-4 w-4" /></div><h2 className="text-base font-semibold text-gray-900">{title}</h2></div>{children}</section>;
}

function Empty() { return <p className="text-sm text-gray-500">Belum ada data.</p>; }

export default function AgentPage() {
  const decisions = readJson<any[]>("decision-log.json", []).slice(0, 50);
  const lessons = readJson<any[]>("agent-lessons.json", []).slice(0, 50);
  const drivers = readJson<any[]>("driver-aliases.learned.json", []).slice(0, 100);
  const areas = readJson<any[]>("area-aliases.learned.json", []).slice(0, 100);
  const cars = readJson<any[]>("car-aliases.learned.json", []).slice(0, 100);
  const orderLessons = readJson<any[]>("order-parser-lessons.json", []).slice(0, 50);
  const reportLessons = readJson<any[]>("report-parser-lessons.json", []).slice(0, 50);

  return <DashboardShell title="Bot Agent">
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="rounded-2xl bg-gray-900 p-6 text-white">
        <p className="text-sm text-gray-300">Arasya WhatsApp Bot</p>
        <h1 className="mt-1 text-2xl font-semibold">Agent Memory, Skills & Decisions</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">Pantau hasil routing #order/#start/#drop/#finish, decision log, alias yang dipelajari, dan parser lessons. Bot tetap keyword-gated dan action harus tool-backed.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-gray-500">Decisions</div><div className="text-2xl font-semibold">{decisions.length}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-gray-500">Lessons</div><div className="text-2xl font-semibold">{lessons.length + orderLessons.length + reportLessons.length}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-gray-500">Aliases</div><div className="text-2xl font-semibold">{drivers.length + areas.length + cars.length}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-gray-500">Wake Keywords</div><div className="mt-1 font-mono text-sm">#order #start #drop #finish</div></div>
      </div>

      <Card title="Recent decision log" icon={ClipboardList}>
        {decisions.length ? <div className="overflow-hidden rounded-lg border"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-3">Time</th><th className="p-3">Skill</th><th className="p-3">Action</th><th className="p-3">Status</th><th className="p-3">Summary</th></tr></thead><tbody className="divide-y">{decisions.map((d)=><tr key={d.id}><td className="p-3 text-xs text-gray-500">{d.ts}</td><td className="p-3 font-medium">{d.skill || d.intent}</td><td className="p-3">{d.action}</td><td className="p-3">{d.status}</td><td className="p-3 text-gray-700">{d.summary || d.reason || "-"}{d.order_code ? <div className="text-xs text-gray-500">Order: {d.order_code}</div> : null}</td></tr>)}</tbody></table></div> : <Empty />}
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Driver aliases" icon={Users}>{drivers.length ? <ul className="space-y-2 text-sm">{drivers.map((a,i)=><li key={i} className="rounded-lg border p-3"><b>{a.alias}</b> → {a.value}<div className="text-xs text-gray-500">{a.source || "agent"}</div></li>)}</ul> : <Empty />}</Card>
        <Card title="Area aliases" icon={MapPin}>{areas.length ? <ul className="space-y-2 text-sm">{areas.map((a,i)=><li key={i} className="rounded-lg border p-3"><b>{a.alias}</b> → {a.value}<div className="text-xs text-gray-500">{a.source || "agent"}</div></li>)}</ul> : <Empty />}</Card>
        <Card title="Car aliases" icon={Car}>{cars.length ? <ul className="space-y-2 text-sm">{cars.map((a,i)=><li key={i} className="rounded-lg border p-3"><b>{a.alias}</b> → {a.value}<div className="text-xs text-gray-500">{a.source || "agent"}</div></li>)}</ul> : <Empty />}</Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Agent lessons" icon={Brain}>{lessons.length ? <ul className="space-y-2 text-sm">{lessons.map((l)=><li key={l.id || l.ts} className="rounded-lg border p-3"><b>{l.type}</b><p className="mt-1 text-gray-700">{l.rule || l.summary || JSON.stringify(l)}</p></li>)}</ul> : <Empty />}</Card>
        <Card title="Parser failures / lessons" icon={Bot}><div className="space-y-4"><div><b className="text-sm">Order parser</b>{orderLessons.length ? <ul className="mt-2 space-y-2 text-sm">{orderLessons.map((l,i)=><li key={i} className="rounded-lg border p-3">{l.reason || l.summary || JSON.stringify(l)}</li>)}</ul> : <Empty />}</div><div><b className="text-sm">Report parser</b>{reportLessons.length ? <ul className="mt-2 space-y-2 text-sm">{reportLessons.map((l,i)=><li key={i} className="rounded-lg border p-3">{l.reason || l.summary || JSON.stringify(l)}</li>)}</ul> : <Empty />}</div></div></Card>
      </div>
    </div>
  </DashboardShell>;
}
