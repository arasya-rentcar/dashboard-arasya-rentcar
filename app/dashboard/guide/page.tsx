"use client";

import { useTranslations } from "next-intl";
import {
  AlertCircle,
  Bot,
  Car,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Handshake,
  HelpCircle,
  MessageCircle,
  MousePointerClick,
  Send,
  Table2,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import DashboardShell from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";

type Pair = { t: string; d: string };

// Sample chat text stays as the bot reads it (Indonesian keywords); the title
// and note of each sample come from guide.botTemplateMeta (same order).
const botTemplateTexts = [
  `#order

PIC:
Nama: Budi Santoso
HP: 081234567890

Booking:
29 Mei 2026 15:00

DETAIL:
1. 30 Mei 2026 | 09:00-11:00
Pickup: Bandara Soekarno-Hatta Terminal 3
Dropoff: Hotel Mulia Senayan
Mobil: ARA
Layanan: 12 JAM
Driver: Sutan
Harga: 750000
Catatan: Jemput VIP`,
  `#order

PIC:
Nama: Budi Santoso
HP: 081234567890

Booking:
29 Mei 2026 15:00

DETAIL:
1. 30 Mei 2026 | 09:00-11:00
Pickup: Bandara Soekarno-Hatta Terminal 3
Dropoff: Hotel Mulia Senayan
Mobil: ARA
Layanan: 12 JAM
Harga: 750000
Catatan: Jemput VIP

@Sutan`,
  `#order

PIC:
Nama: Budi Santoso
HP: 081234567890

Booking:
29 Mei 2026 15:00

DETAIL:
1. 30 Mei 2026 | 09:00-11:00
Pickup: Bandara Soetta T3
Dropoff: Hotel Mulia
Mobil: ARA
Layanan: 12 JAM
Driver: Sutan
Harga: 750000

2. 31 Mei 2026 | 08:00-17:00
Pickup: Hotel Mulia
Dropoff: Sentul
Mobil: ARA
Layanan: FULL DAY
Driver: Rori
Harga: 950000
Catatan: Hari kedua ganti driver`,
  `#order

PIC:
Nama: Rina
HP: 082222222222

Booking:
29 Mei 2026 16:00

DETAIL:
1. 30 Mei 2026 | 10:00-12:00
Pickup: Stasiun Gambir
Dropoff: Hotel Indonesia Kempinski
Mobil: FCB
Layanan: FULL DAY
Driver: Ruli
Harga: 650000

2. 31 Mei 2026 | 08:00-TBC
Pickup: Hotel Indonesia Kempinski
Dropoff: TBA
Mobil: FCB
Layanan: FULL DAY
Driver: Ruli
Harga: 650000
Catatan: Tujuan hari kedua menyusul`,
  `#order

PIC:
Nama: Budi Santoso
HP: 081234567890

Booking:
29 Mei 2026 15:00

DETAIL:
1. 30 Mei 2026 | 09:00-11:00
Pickup: Bandara Soekarno-Hatta Terminal 3
Dropoff: Hotel Mulia Senayan
Mobil: External Innova
Layanan: ALL INCLUDED
Driver: Budi External / 081288889999 / Bandung
Harga: 750000
Catatan: Driver luar, asal Bandung`,
  `#order

PIC:
Nama: Budi Santoso
HP: 081234567890
PIC 2: Sari Finance / 082222222222
PIC 3: Andi Lapangan / 083333333333

Booking:
29 Mei 2026 15:00

DETAIL:
1. 30 Mei 2026 | 09:00-11:00
Pickup: Kantor Customer
Dropoff: Bandara Soetta
Mobil: VLZ1
Layanan: 12 JAM
Driver: Rori
Harga: 700000`,
];

// Sample driver messages (what the driver types). Labels come from
// guide.reportExampleLabels (same order, plus one for the caption rule).
const driverReportExamples = [
  "#start\nStart dari pool Arasya menuju pickup customer. Odo 12345.",
  "#drop\nSudah dropoff di tujuan / customer sudah turun.",
  "#drop 1\nCustomer pertama turun di Hotel Mulia.",
  "#drop 2\nCustomer kedua turun di Bandara Soetta Terminal 3.",
  "#drop\nDrop tambahan di PIK. Parkir 20000.",
  "#finish\nSelesai semua. Odo 12430. Parkir 25000.",
];

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-gray-900 p-2 text-white">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="whitespace-pre-wrap break-words rounded-lg bg-gray-950 p-3 text-sm leading-relaxed text-gray-50 sm:p-4">
      {children}
    </pre>
  );
}

export default function GuidePage() {
  const t = useTranslations("guide");
  const steps = t.raw("steps") as string[];
  const keywords = t.raw("keywords") as { k: string; d: string }[];
  const websiteCases = t.raw("websiteCases") as Pair[];
  const scheduleCases = t.raw("scheduleCases") as Pair[];
  const customerCases = t.raw("customerCases") as Pair[];
  const externalCases = t.raw("externalCases") as Pair[];
  const websiteMenuParas = t.raw("websiteMenuParas") as string[];
  const botWakeKeywords = t.raw("botWakeKeywords") as { k: string; d: string }[];
  const mistakes = t.raw("mistakes") as string[];
  const botTemplateMeta = t.raw("botTemplateMeta") as Pair[];
  const reportLabels = t.raw("reportExampleLabels") as string[];
  return (
    <DashboardShell title={t("title")}>
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-2xl bg-gray-900 p-5 text-white sm:p-6">
          <p className="text-sm text-gray-300">{t("heroKicker")}</p>
          <h2 className="mt-1 text-xl font-semibold sm:text-2xl">
            {t("heroTitle")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
            {t("heroSubtitle")}
          </p>
        </div>

        <Card title={t("dailyFlowTitle")} icon={CheckCircle2}>
          <ol className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
            {steps.map((step, i) => (
              <li key={step} className="flex gap-2">
                <span className="font-semibold text-gray-900">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title={t("websiteMenuTitle")} icon={MousePointerClick}>
            <div className="space-y-3 text-sm text-gray-700">
              {websiteMenuParas.map((para) => (
                <p key={para}>{para}</p>
              ))}
            </div>
          </Card>

          <Card title={t("websiteCasesTitle")} icon={Table2}>
            <div className="space-y-2 text-sm text-gray-700">
              {websiteCases.map((c) => (
                <div key={c.t} className="rounded-lg border p-3">
                  <b>{c.t}</b>
                  <p className="mt-1">{c.d}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card title={t("scheduleTitle")} icon={CalendarDays}>
          <div className="space-y-3 text-sm text-gray-700">
            <p>{t("scheduleIntro")}</p>
            <div className="grid gap-2 md:grid-cols-2">
              {scheduleCases.map((c) => (
                <div key={c.t} className="rounded-lg border p-3">
                  <b>{c.t}</b>
                  <p className="mt-1">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title={t("customersTitle")} icon={UserRound}>
            <div className="space-y-2 text-sm text-gray-700">
              {customerCases.map((c) => (
                <div key={c.t} className="rounded-lg border p-3">
                  <b>{c.t}</b>
                  <p className="mt-1">{c.d}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title={t("externalTitle")} icon={Handshake}>
            <div className="space-y-2 text-sm text-gray-700">
              {externalCases.map((c) => (
                <div key={c.t} className="rounded-lg border p-3">
                  <b>{c.t}</b>
                  <p className="mt-1">{c.d}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card title={t("invoiceTitle")} icon={FileText}>
          <div className="grid gap-4 text-sm text-gray-700 lg:grid-cols-3">
            <div className="rounded-lg border p-4">
              <b>{t("invoiceGenerate")}</b>
              <p className="mt-1">{t("invoiceGenerateDesc")}</p>
            </div>
            <div className="rounded-lg border p-4">
              <b>{t("invoiceSendPdf")}</b>
              <p className="mt-1">{t("invoiceSendPdfDesc")}</p>
            </div>
            <div className="rounded-lg border p-4">
              <b>{t("invoiceHistory")}</b>
              <p className="mt-1">{t("invoiceHistoryDesc")}</p>
            </div>
          </div>
        </Card>

        <Card title={t("serviceTypesTitle")} icon={Car}>
          <div className="space-y-3 text-sm text-gray-700">
            <p>{t("serviceTypesIntro")}</p>
            <Button asChild variant="outline">
              <Link href="/dashboard/price-list">{t("priceListLink")}</Link>
            </Button>
          </div>
        </Card>

        <Card title={t("botTriggerTitle")} icon={Bot}>
          <div className="space-y-4 text-sm text-gray-700">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <b>{t("botTriggerWarnTitle")}</b>
              <p className="mt-1">{t("botTriggerWarnBody")}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {botWakeKeywords.map((kw) => (
                <div key={kw.k} className="rounded-lg border p-4">
                  <div className="font-mono text-base font-semibold text-gray-900">
                    {kw.k}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-gray-600">
                    {kw.d}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <CodeBlock>{`#order
PIC:
Nama: Budi
HP: 081234567890

DETAIL:
1. 30 Mei 2026 | 09:00
Pickup: Bandara Soetta
Dropoff: Hotel Mulia
Mobil: ARA
Driver: Sutan
Harga: 750000`}</CodeBlock>
              <CodeBlock>{`#start
Sudah sampai lokasi pickup

#drop
Customer sudah turun di tujuan

#drop 1
Customer pertama turun di Hotel Mulia

#drop 2
Customer kedua turun di Bandara Soetta T3

#finish
Selesai semua, unit kembali standby`}</CodeBlock>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-900">
              {t("multiDropNote")}
            </div>
            <p className="text-xs text-gray-500">
              {t("captionNote")}
            </p>
          </div>
        </Card>

        <Card title={t("botOrderRulesTitle")} icon={MessageCircle}>
          <div className="grid gap-4 text-sm text-gray-700 lg:grid-cols-3">
            <div className="rounded-lg border p-4">
              <Users className="mb-2 h-5 w-5 text-gray-900" />
              <b>{t("internalDriverTitle")}</b>
              <p className="mt-1">{t("internalDriverDesc")}</p>
            </div>
            <div className="rounded-lg border p-4">
              <Car className="mb-2 h-5 w-5 text-gray-900" />
              <b>{t("externalDriverTitle")}</b>
              <p className="mt-1">{t("externalDriverDesc")}</p>
            </div>
            <div className="rounded-lg border p-4">
              <AlertCircle className="mb-2 h-5 w-5 text-gray-900" />
              <b>{t("tbaTitle")}</b>
              <p className="mt-1">{t("tbaDesc")}</p>
            </div>
          </div>
        </Card>

        <Card
          title={t("botChatExamplesTitle")}
          icon={MessageCircle}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {botTemplateTexts.map((text, i) => (
              <div key={i} className="min-w-0 space-y-2 rounded-xl border p-4">
                <div>
                  <b className="text-sm text-gray-900">{botTemplateMeta[i]?.t}</b>
                  <p className="text-xs text-gray-500">{botTemplateMeta[i]?.d}</p>
                </div>
                <CodeBlock>{text}</CodeBlock>
              </div>
            ))}
          </div>
        </Card>

        <Card title={t("driverReportTitle")} icon={Send}>
          <div className="grid gap-3 text-sm text-gray-700 md:grid-cols-2">
            {driverReportExamples.map((text, i) => (
              <div key={i} className="min-w-0 space-y-2 rounded-lg border p-3">
                <b>{reportLabels[i]}</b>
                <CodeBlock>{text}</CodeBlock>
              </div>
            ))}
            <div className="min-w-0 space-y-2 rounded-lg border p-3">
              <b>{reportLabels[driverReportExamples.length]}</b>
              <CodeBlock>{t("reportCaptionRule")}</CodeBlock>
            </div>
          </div>
        </Card>

        <Card title={t("keywordsTitle")} icon={ClipboardList}>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-3">{t("colKeyword")}</th>
                  <th className="p-3">{t("colMeaning")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {keywords.map((kw) => (
                  <tr key={kw.k}>
                    <td className="p-3 font-medium text-gray-900">{kw.k}</td>
                    <td className="p-3 text-gray-700">{kw.d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={t("componentExampleTitle")} icon={Table2}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="mb-2 text-sm font-semibold">
                {t("exampleInvoiceTable")}
              </div>
              <div className="rounded-md bg-white p-3 text-sm shadow-sm">
                <div className="grid grid-cols-4 gap-2 border-b pb-2 text-xs font-medium text-gray-500">
                  <span>{t("colInvoice")}</span>
                  <span>{t("colCustomer")}</span>
                  <span>{t("colStatus")}</span>
                  <span>{t("colAction")}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 py-2">
                  <span>INV-001</span>
                  <span>Budi</span>
                  <span className="text-emerald-600">ISSUED</span>
                  <span>PDF / Send</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="mb-2 text-sm font-semibold">
                {t("exampleServiceRow")}
              </div>
              <div className="space-y-2 rounded-md bg-white p-3 text-sm shadow-sm">
                <div>
                  <b>Pickup:</b> Bandara Soetta T3
                </div>
                <div>
                  <b>Dropoff:</b> Hotel Mulia
                </div>
                <div>
                  <b>Mobil:</b> ARA | <b>Harga:</b> Rp750.000
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card title={t("mistakesTitle")} icon={HelpCircle}>
          <ul className="space-y-2 text-sm text-gray-700">
            {mistakes.map((m) => (
              <li key={m} className="flex gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                {m}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </DashboardShell>
  );
}
