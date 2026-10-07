'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  ArrowRight,
  CalendarDays,
  Car,
  ExternalLink,
  Link2,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import TablePagination from '@/components/dashboard/TablePagination';
import QueryError from '@/components/dashboard/QueryError';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import MapPointLink from '@/components/dashboard/MapPointLink';
import { ordersApi } from '@/lib/api';
import { toGeoPoint, type GeoPoint } from '@/lib/maps';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  useIgnoreLead,
  useLeads,
  useLinkLead,
  useReopenLead,
} from '@/hooks/useLeads';
import {
  cn,
  formatCurrency,
  formatDateTime,
  getErrorMessage,
} from '@/lib/utils';
import type { WebLead, WebLeadStatus } from '@/types';

const PAGE_SIZE = 20;
const TABS: (WebLeadStatus | 'ALL')[] = ['NEW', 'CONVERTED', 'IGNORED', 'ALL'];
const STATUS_STYLE: Record<WebLeadStatus, string> = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  CONVERTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  IGNORED: 'bg-gray-50 text-gray-500 border-gray-200',
};

/**
 * Lead Website: booking requests sent from the public website's form. Each
 * one also arrived on WhatsApp with the same ARS-XXXXX code; the admin turns
 * it into an order (prefilled), links it to an order already made from the
 * chat, or ignores it.
 */
export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsPageInner />
    </Suspense>
  );
}

function LeadsPageInner() {
  const t = useTranslations('leads');
  // Deep link from an order: /dashboard/leads?q=ARS-XXXXX searches that code
  // across every status (the lead may already be converted).
  const initialQ = useSearchParams().get('q') ?? '';
  const [tab, setTab] = useState<WebLeadStatus | 'ALL'>(initialQ ? 'ALL' : 'NEW');
  const [search, setSearch] = useState(initialQ);
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());

  const key = `${tab}|${q}`;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setPage(1);
  }

  const { data, isLoading, isError, isFetching, refetch } = useLeads(
    { status: tab === 'ALL' ? undefined : tab, q: q || undefined, page, limit: PAGE_SIZE },
    { refetchInterval: 60_000 },
  );
  const rows = data?.data ?? [];
  const meta = data?.meta;
  const counts = meta?.counts ?? {};
  const allCount = (counts.NEW ?? 0) + (counts.CONVERTED ?? 0) + (counts.IGNORED ?? 0);

  const [ignoring, setIgnoring] = useState<WebLead | null>(null);
  const [linking, setLinking] = useState<WebLead | null>(null);
  const reopen = useReopenLead();

  return (
    <DashboardShell title={t('title')}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500 max-w-3xl">{t('intro')}</p>

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('title')}>
            {TABS.map((s) => {
              const n = s === 'ALL' ? allCount : counts[s] ?? 0;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={tab === s}
                  onClick={() => setTab(s)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                    tab === s
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                  )}
                >
                  {t(`tab${s}`)}
                  <span className={cn('ml-1.5 tabular-nums', tab === s ? 'text-white/70' : 'text-gray-400')}>{n}</span>
                </button>
              );
            })}
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl border border-gray-200 bg-white animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <QueryError onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white py-14 text-center text-sm text-gray-400">
            {tab === 'NEW' ? t('emptyNew') : t('empty')}
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onIgnore={() => setIgnoring(lead)}
                onLink={() => setLinking(lead)}
                reopening={reopen.isPending && reopen.variables === lead.id}
                onReopen={async () => {
                  try {
                    await reopen.mutateAsync(lead.id);
                    toast.success(t('okReopened'));
                  } catch (err) {
                    toast.error(getErrorMessage(err));
                  }
                }}
              />
            ))}
          </div>
        )}

        {meta && (
          <div className="flex flex-col-reverse items-center gap-2 sm:flex-row sm:justify-between">
            <span className="text-xs text-gray-400" aria-live="polite">{isFetching ? t('updating') : ' '}</span>
            <TablePagination
              page={meta.page}
              pageCount={meta.total_pages}
              total={meta.total}
              start={(meta.page - 1) * meta.limit}
              pageSize={meta.limit}
              onPageChange={setPage}
              label={t('paginationLabel')}
            />
          </div>
        )}
      </div>

      <IgnoreDialog lead={ignoring} onClose={() => setIgnoring(null)} />
      <LinkDialog lead={linking} onClose={() => setLinking(null)} />
    </DashboardShell>
  );
}

function tripDate(lead: WebLead, locale: string) {
  if (!lead.trip_date) return null;
  // trip_date is a WIB calendar day: pin both parsing and formatting to WIB.
  const d = new Date(`${lead.trip_date}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return lead.trip_date;
  const day = d.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
  return lead.pickup_time ? `${day} · ${lead.pickup_time}` : day;
}

function LeadCard({
  lead,
  onIgnore,
  onLink,
  onReopen,
  reopening,
}: {
  lead: WebLead;
  onIgnore: () => void;
  onLink: () => void;
  onReopen: () => void;
  reopening: boolean;
}) {
  const t = useTranslations('leads');
  const locale = useLocale() === 'en' ? 'en-GB' : 'id-ID';
  const extras = [
    lead.passenger_count ? t('pax', { n: lead.passenger_count }) : null,
    lead.duration,
  ].filter(Boolean);
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="font-mono text-sm font-semibold text-gray-900">{lead.lead_code}</span>
        <Badge variant="outline" className={cn('text-[11px]', STATUS_STYLE[lead.status])}>
          {t(`status${lead.status}`)}
        </Badge>
        <span className="text-xs text-gray-400">{t('received', { at: formatDateTime(lead.created_at) })}</span>
        {lead.language === 'en' && (
          <Badge variant="outline" className="text-[11px] bg-amber-50 text-amber-700 border-amber-200">EN</Badge>
        )}
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid min-w-0 grid-cols-1 gap-2">
          <p className="text-base font-semibold text-gray-950 break-words">{lead.name}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-gray-700">
            <Info icon={CalendarDays}>{tripDate(lead, locale) ?? t('noDate')}</Info>
            <Info icon={Car}>
              {lead.unit || t('anyUnit')}
              <FleetBadge lead={lead} />
            </Info>
          </div>
          <div className="text-sm text-gray-700">
            <Info icon={MapPin}>
              {/* Full addresses wrap: the admin needs them to quote and plan. */}
              <span className="min-w-0 break-words">
                {lead.pickup_location}
                {lead.destination && (
                  <>
                    <ArrowRight className="mx-1 inline h-3.5 w-3.5 align-[-2px] text-gray-400" aria-hidden="true" />
                    {lead.destination}
                  </>
                )}
              </span>
            </Info>
            <LeadPoints lead={lead} />
          </div>
          {(extras.length > 0 || lead.notes) && (
            <p className="text-sm text-gray-500 break-words">
              {extras.join(' · ')}
              {extras.length > 0 && lead.notes ? ' · ' : ''}
              {lead.notes && <span className="italic">“{lead.notes}”</span>}
            </p>
          )}
          <p
            className="text-xs text-gray-400 truncate"
            title={[lead.page_path, lead.campaign].filter(Boolean).join(' · ') || undefined}
          >
            {t('from')} <span className="font-mono">{lead.page_path || '-'}</span>
            {lead.campaign && <> · {lead.campaign}</>}
          </p>
          {lead.status === 'IGNORED' && lead.ignore_reason && (
            <p className="text-xs text-gray-500">{t('ignoredBecause', { reason: lead.ignore_reason })}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {lead.status === 'NEW' && (
            <>
              <Button size="sm" asChild>
                <Link href={`/dashboard/orders?lead=${lead.id}`}>
                  <Sparkles className="h-4 w-4" /> {t('createOrder')}
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={onLink}>
                <Link2 className="h-4 w-4" /> {t('linkOrder')}
              </Button>
              <Button size="sm" variant="ghost" className="text-gray-500 hover:text-red-600" onClick={onIgnore}>
                <XCircle className="h-4 w-4" /> {t('ignore')}
              </Button>
            </>
          )}
          {lead.status === 'CONVERTED' && lead.order && (
            <div className="flex flex-col items-start gap-1 lg:items-end">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/dashboard/orders/${lead.order.id}`}>
                  <ExternalLink className="h-4 w-4" /> {lead.order.order_code || t('openOrder')}
                </Link>
              </Button>
              <span className="text-xs text-gray-500">
                {lead.order.final_price != null && formatCurrency(lead.order.final_price)}
                {lead.order.payment_status && <> · {t(`pay${lead.order.payment_status}`)}</>}
              </span>
              {lead.purchase_reported_at && (
                <span className="text-xs text-emerald-600">{t('ga4Sent')}</span>
              )}
            </div>
          )}
          {lead.status === 'IGNORED' && (
            <Button size="sm" variant="outline" onClick={onReopen} disabled={reopening}>
              {reopening ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {t('reopen')}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

// Map points the customer picked on the website (none on older leads: then
// nothing is shown and the card looks as before).
function LeadPoints({ lead }: { lead: WebLead }) {
  const t = useTranslations('maps');
  const pickup = toGeoPoint(lead.pickup_lat, lead.pickup_lng, lead.pickup_place_id);
  const destination = toGeoPoint(lead.destination_lat, lead.destination_lng, lead.destination_place_id);
  if (!pickup && !destination) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 pl-5.5 text-xs text-gray-600">
      {pickup && (
        <PointInfo
          label={t('pickupPoint')}
          name={usefulPlaceName(lead.pickup_place_name, lead.pickup_location)}
          point={pickup}
        />
      )}
      {destination && (
        <PointInfo
          label={t('destinationPoint')}
          name={usefulPlaceName(lead.destination_place_name, lead.destination)}
          point={destination}
        />
      )}
    </div>
  );
}

// The website fills the address field with "place name, address", so the
// name is only worth repeating when the text does not already contain it.
function usefulPlaceName(name?: string | null, text?: string | null) {
  const n = name?.trim();
  if (!n) return null;
  return text?.toLowerCase().includes(n.toLowerCase()) ? null : n;
}

function PointInfo({ label, name, point }: { label: string; name: string | null; point: GeoPoint }) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5">
      <span className="font-medium text-gray-700">{label}</span>
      {name && <span className="break-words">· {name}</span>}
      <span aria-hidden="true">·</span>
      <MapPointLink point={point} label={label} />
    </span>
  );
}

// Does Arasya own the unit the customer asked for? null = unknown: no badge.
function FleetBadge({ lead }: { lead: WebLead }) {
  const t = useTranslations('leads');
  if (lead.unit_in_fleet == null) return null;
  if (lead.unit_in_fleet) {
    const cars = (lead.matching_cars ?? [])
      .map((c) => `${c.model}${c.plate_number ? ` (${c.plate_number})` : ''}`)
      .join(', ');
    return (
      <Badge
        variant="outline"
        title={cars ? t('inFleetTitle', { cars }) : undefined}
        className="ml-1 shrink-0 text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200"
      >
        {t('inFleet')}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      title={t('needPartnerTitle')}
      className="ml-1 shrink-0 text-[11px] bg-amber-50 text-amber-700 border-amber-200"
    >
      {t('needPartner')}
    </Badge>
  );
}

function Info({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <span className="flex items-start gap-1.5 min-w-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      {children}
    </span>
  );
}

function IgnoreDialog({ lead, onClose }: { lead: WebLead | null; onClose: () => void }) {
  const t = useTranslations('leads');
  const ignore = useIgnoreLead();
  const [reason, setReason] = useState('');
  const reasons = [t('reasonSpam'), t('reasonDuplicate'), t('reasonJustAsking'), t('reasonNoUnit')];
  async function submit() {
    if (!lead) return;
    try {
      await ignore.mutateAsync({ id: lead.id, reason: reason.trim() || undefined });
      toast.success(t('okIgnored'));
      close();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }
  // A reason typed for one lead must not carry over to the next one.
  function close() {
    setReason('');
    onClose();
  }
  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('ignoreTitle', { code: lead?.lead_code ?? '' })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label className="text-xs text-gray-500">{t('reasonLabel')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {reasons.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(r)}
                className={cn(
                  'min-h-8 rounded-full border px-3 py-1 text-xs',
                  reason === r ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('reasonPlaceholder')}
            aria-label={t('reasonLabel')}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={close}>{t('cancel')}</Button>
            <Button variant="destructive" onClick={submit} disabled={ignore.isPending}>
              {ignore.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('ignore')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface OrderHit {
  id: string;
  order_code: string | null;
  customer_name: string;
  pickup_location?: string;
  service_start_at?: string | null;
  order_date?: string;
}

function LinkDialog({ lead, onClose }: { lead: WebLead | null; onClose: () => void }) {
  const t = useTranslations('leads');
  const link = useLinkLead();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<OrderHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function find() {
    const term = query.trim() || lead?.name || '';
    if (!term) return;
    setSearching(true);
    try {
      const res = await ordersApi.search({ search: term, page: 1, page_size: 8 });
      setHits(res.data.data as OrderHit[]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSearching(false);
    }
  }
  async function choose(order: OrderHit) {
    if (!lead) return;
    try {
      await link.mutateAsync({ id: lead.id, order_id: order.id });
      toast.success(t('okLinked', { code: lead.lead_code, order: order.order_code ?? '' }));
      close();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }
  function close() {
    setQuery('');
    setHits(null);
    onClose();
  }
  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('linkTitle', { code: lead?.lead_code ?? '' })}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500">{t('linkHelp')}</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            find();
          }}
        >
          <Input
            autoFocus
            type="search"
            aria-label={t('linkPlaceholder', { name: lead?.name ?? '' })}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('linkPlaceholder', { name: lead?.name ?? '' })}
          />
          <Button
            type="submit"
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled={searching}
            aria-label={t('linkSearch')}
            title={t('linkSearch')}
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>
        {hits && (
          <div className="max-h-72 overflow-y-auto divide-y rounded-lg border border-gray-200">
            {hits.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-400">{t('linkNone')}</p>
            ) : (
              hits.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={link.isPending}
                  onClick={() => choose(o)}
                  className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-gray-50 disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-sm font-medium text-gray-900">{o.order_code ?? '-'}</span>
                    <span className="block truncate text-xs text-gray-500" title={o.customer_name}>
                      {o.customer_name}
                      {o.pickup_location && <> · {o.pickup_location}</>}
                      {(o.service_start_at || o.order_date) && <> · {formatDateTime((o.service_start_at || o.order_date)!)}</>}
                    </span>
                  </span>
                  <Link2 className="h-4 w-4 shrink-0 text-gray-400" />
                </button>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
