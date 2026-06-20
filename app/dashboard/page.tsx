'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Wallet,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Car,
  Handshake,
  Loader2,
  Banknote,
  Receipt,
} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PeriodToggle from '@/components/revenue/PeriodToggle';
import Sparkbars from '@/components/dashboard/Sparkbars';
import { useRevenuePeriod } from '@/hooks/useRevenuePeriod';
import { useDashboardV2 } from '@/hooks/useAnalytics';
import { describePeriod, resolvePeriod } from '@/lib/revenuePeriod';
import { formatCurrency } from '@/lib/utils';
import type { DashboardV2, DashV2OverdueAR, DashV2OverdueAP } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard v2 — single-page owner + finance view.
//
// Accounting basis (LOCKED — must match analytics.service.ts dashboardV2):
//   • Accrual rows (Revenue, Margin, Channel) use OrderServiceItem.service_date.
//   • Cash rows (Collected, Paid out, Net cash) use Receipt.payment_date and
//     Payable.paid_at. Each card explicitly labels its basis.
//   • Outstanding + Overdue are a NOW snapshot (not period-scoped); overdue
//     means service has started but the invoice / payable is still unsettled
//     (Arasya rule: rental due day-1 of service).
//   • Δ vs prior period uses the same-length window immediately before [from,to].
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { period } = useRevenuePeriod('dashboard');
  const range = useMemo(() => resolvePeriod(period), [period]);
  const { data, isLoading, isFetching } = useDashboardV2({
    date_from: range.date_from,
    date_to: range.date_to,
  });

  return (
    <DashboardShell title="Dashboard">
      <div className="space-y-6">
        {/* Header: one period selector, the page-wide source of truth. */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <p className="text-xs text-gray-500">Periode (WIB)</p>
            <p className="text-sm font-medium text-gray-800">
              {describePeriod(period)}
              {isFetching && (
                <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-gray-400" />
              )}
            </p>
          </div>
          <PeriodToggle surface="dashboard" />
        </div>

        {isLoading || !data ? (
          <SkeletonHealthRow />
        ) : (
          <>
            <HealthRow data={data} />
            <ChannelSplit data={data} />
            <NeedsAttention data={data} />
            <Trend data={data} />
          </>
        )}
      </div>
    </DashboardShell>
  );
}

// ─── § 1 Health row ───────────────────────────────────────────────────────────
function HealthRow({ data }: { data: DashboardV2 }) {
  const a = data.accrual;
  const c = data.cash;
  const o = data.outstanding;
  return (
    <section>
      <SectionTitle
        title="Kondisi periode ini"
        sub="Margin operasional memimpin. Kas, piutang, hutang di sebelahnya untuk konteks."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Lead KPI: Operating Margin (accrual). */}
        <LeadKPI
          icon={<TrendingUp className="h-5 w-5" />}
          label="Operating Margin"
          basis="Accrual · basis tanggal layanan"
          value={formatCurrency(a.margin)}
          sub={
            a.margin_pct == null
              ? '—'
              : `Margin ${(a.margin_pct * 100).toFixed(1)}%`
          }
          delta={a.delta.margin}
        />
        <KPI
          icon={<Receipt className="h-4 w-4" />}
          label="Revenue"
          basis="Accrual"
          value={formatCurrency(a.revenue)}
          sub={`${a.trips} trip`}
          delta={a.delta.revenue}
        />
        <KPI
          icon={<Wallet className="h-4 w-4" />}
          label="Net Cash Flow"
          basis="Cash · uang masuk − uang keluar"
          value={formatCurrency(c.net_cash)}
          sub={`Masuk ${formatCurrency(c.collected)} · Keluar ${formatCurrency(c.paid_out)}`}
          delta={c.delta.net_cash}
        />
        <OutstandingKPI o={o} />
      </div>
    </section>
  );
}

// ─── § 2 Channel split ────────────────────────────────────────────────────────
function ChannelSplit({ data }: { data: DashboardV2 }) {
  const i = data.channel.internal;
  const v = data.channel.vendor;
  return (
    <section>
      <SectionTitle title="Per jalur" sub="Internal cars vs vendor." />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="border border-gray-200 shadow-none">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Car className="h-4 w-4" /> Internal Cars
              </div>
              <Link
                href="/dashboard/cars"
                className="text-xs text-blue-600 hover:underline"
              >
                Lihat per unit →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Row label="Revenue" value={i.revenue} />
              <Row label="Ops cost" value={i.ops_cost} muted />
              <Row label="Driver fee" value={i.driver_cost} muted />
              <Row label="Trips" value={i.trips} raw />
            </div>
            <div className="border-t border-gray-100 pt-2">
              <p className="text-[11px] text-gray-500">Margin</p>
              <p className="text-xl font-semibold text-emerald-700">
                {formatCurrency(i.margin)}
                <span className="ml-2 text-xs font-normal text-gray-500">
                  {i.margin_pct == null
                    ? ''
                    : `(${(i.margin_pct * 100).toFixed(1)}%)`}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-none">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Handshake className="h-4 w-4" /> Vendor Channel
              </div>
              <Link
                href="/dashboard/external"
                className="text-xs text-blue-600 hover:underline"
              >
                Lihat per vendor →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Row label="Billed" value={v.billed} />
              <Row label="Vendor cost" value={v.vendor_cost} muted />
              <Row label="Trips" value={v.trips} raw />
            </div>
            <div className="border-t border-gray-100 pt-2">
              <p className="text-[11px] text-gray-500">Margin</p>
              <p className="text-xl font-semibold text-emerald-700">
                {formatCurrency(v.margin)}
                <span className="ml-2 text-xs font-normal text-gray-500">
                  {v.margin_pct == null
                    ? ''
                    : `(${(v.margin_pct * 100).toFixed(1)}%)`}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ─── § 3 Needs attention (overdue) ────────────────────────────────────────────
function NeedsAttention({ data }: { data: DashboardV2 }) {
  const ar = data.outstanding.ar_overdue_top;
  const ap = data.outstanding.ap_overdue_top;
  return (
    <section>
      <SectionTitle
        title="Perlu tindakan"
        sub="Layanan sudah jalan tapi belum diselesaikan (jatuh tempo = hari layanan dimulai)."
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <OverdueCard
          title="Piutang Overdue"
          color="amber"
          totalCount={data.outstanding.ar_overdue_count}
          totalAmount={data.outstanding.ar_outstanding}
          empty="Tidak ada piutang lewat jatuh tempo."
        >
          {ar.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="pb-1.5">Customer</th>
                  <th className="pb-1.5 text-right">Amount</th>
                  <th className="pb-1.5 text-right">Late</th>
                </tr>
              </thead>
              <tbody>
                {ar.map((r: DashV2OverdueAR) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="py-2 pr-2">
                      <Link
                        href={`/dashboard/orders/${r.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {r.customer}
                      </Link>
                      <p className="text-[11px] text-gray-400">
                        {r.order_code ?? '—'}
                      </p>
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="py-2 text-right text-amber-700">
                      {r.days_overdue}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </OverdueCard>
        <OverdueCard
          title="Hutang Overdue"
          color="rose"
          totalCount={data.outstanding.ap_overdue_count}
          totalAmount={data.outstanding.ap_outstanding}
          empty="Tidak ada hutang ke driver / vendor yang lewat jatuh tempo."
        >
          {ap.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="pb-1.5">Pihak</th>
                  <th className="pb-1.5 text-right">Amount</th>
                  <th className="pb-1.5 text-right">Late</th>
                </tr>
              </thead>
              <tbody>
                {ap.map((r: DashV2OverdueAP) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="py-2 pr-2">
                      <Link
                        href={r.order_id ? `/dashboard/orders/${r.order_id}` : '/dashboard/payables'}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {r.counterparty}
                      </Link>
                      <p className="text-[11px] text-gray-400">
                        <Badge variant="outline" className="h-4 px-1 text-[10px]">
                          {r.kind === 'DRIVER' ? 'Driver' : 'Vendor'}
                        </Badge>{' '}
                        {r.order_code ?? ''}
                      </p>
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="py-2 text-right text-rose-700">
                      {r.days_overdue}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </OverdueCard>
      </div>
    </section>
  );
}

// ─── § 4 Trend ────────────────────────────────────────────────────────────────
function Trend({ data }: { data: DashboardV2 }) {
  return (
    <section>
      <SectionTitle
        title="Tren 6 bulan"
        sub="Revenue dan margin per bulan kalender WIB (akhir bulan = batas atas periode aktif)."
      />
      <Card className="border border-gray-200 shadow-none">
        <CardContent className="p-4">
          <Sparkbars points={data.trend} />
        </CardContent>
      </Card>
    </section>
  );
}

// ─── Bits ─────────────────────────────────────────────────────────────────────
function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}

function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="text-[11px] text-gray-400">— vs prev</span>;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const cls = up ? 'text-emerald-600' : 'text-rose-600';
  const pct = `${(Math.abs(value) * 100).toFixed(1)}%`;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${cls}`}>
      <Icon className="h-3 w-3" /> {pct} vs prev
    </span>
  );
}

function LeadKPI({
  icon,
  label,
  basis,
  value,
  sub,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  basis: string;
  value: string;
  sub: string;
  delta: number | null;
}) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/40 shadow-none">
      <CardContent className="space-y-1.5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-900">
            {icon} {label}
          </div>
          <Delta value={delta} />
        </div>
        <p className="text-[10px] uppercase tracking-wide text-emerald-700/60">
          {basis}
        </p>
        <p className="text-2xl font-bold tabular-nums text-emerald-800">{value}</p>
        <p className="text-xs text-emerald-900/80">{sub}</p>
      </CardContent>
    </Card>
  );
}

function KPI({
  icon,
  label,
  basis,
  value,
  sub,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  basis: string;
  value: string;
  sub: string;
  delta?: number | null;
}) {
  return (
    <Card className="border border-gray-200 shadow-none">
      <CardContent className="space-y-1.5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
            {icon} {label}
          </div>
          {delta !== undefined && <Delta value={delta ?? null} />}
        </div>
        <p className="text-[10px] uppercase tracking-wide text-gray-400">{basis}</p>
        <p className="text-xl font-semibold tabular-nums text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{sub}</p>
      </CardContent>
    </Card>
  );
}

function OutstandingKPI({ o }: { o: DashboardV2['outstanding'] }) {
  return (
    <Card className="border border-gray-200 shadow-none">
      <CardContent className="space-y-1.5 p-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
          <AlertCircle className="h-4 w-4" /> Outstanding
        </div>
        <p className="text-[10px] uppercase tracking-wide text-gray-400">
          Snapshot saat ini
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-[11px] text-gray-500">AR (piutang)</p>
            <p className="text-base font-semibold text-amber-700 tabular-nums">
              {formatCurrency(o.ar_outstanding)}
            </p>
            <p className="text-[11px] text-amber-700/80">
              {o.ar_overdue_count} overdue
            </p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500">AP (hutang)</p>
            <p className="text-base font-semibold text-rose-700 tabular-nums">
              {formatCurrency(o.ap_outstanding)}
            </p>
            <p className="text-[11px] text-rose-700/80">
              {o.ap_overdue_count} overdue
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  muted,
  raw,
}: {
  label: string;
  value: number;
  muted?: boolean;
  raw?: boolean;
}) {
  return (
    <>
      <span className="text-xs text-gray-500">{label}</span>
      <span
        className={`text-right tabular-nums ${muted ? 'text-gray-500' : 'text-gray-800'}`}
      >
        {raw ? value : formatCurrency(value)}
      </span>
    </>
  );
}

function OverdueCard({
  title,
  color,
  totalCount,
  totalAmount,
  children,
  empty,
}: {
  title: string;
  color: 'amber' | 'rose';
  totalCount: number;
  totalAmount: number;
  children?: React.ReactNode;
  empty: string;
}) {
  const tone =
    color === 'amber'
      ? 'border-amber-200 bg-amber-50/40'
      : 'border-rose-200 bg-rose-50/40';
  const accent = color === 'amber' ? 'text-amber-700' : 'text-rose-700';
  return (
    <Card className={`shadow-none ${tone}`}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">{title}</p>
          <p className={`text-xs font-medium ${accent}`}>
            {totalCount} overdue ·{' '}
            <span className="tabular-nums">{formatCurrency(totalAmount)}</span> total
          </p>
        </div>
        {totalCount === 0 ? (
          <p className="py-3 text-center text-xs text-gray-400">{empty}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function SkeletonHealthRow() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="border border-gray-200 shadow-none">
          <CardContent className="space-y-2 p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
            <div className="h-7 w-32 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Keep an explicit import to silence unused-warn linters that don't know the
// hook is referenced indirectly via TypeScript path resolution.
export const _kpiIcons = { TrendingUp, Wallet, AlertCircle, Banknote };
