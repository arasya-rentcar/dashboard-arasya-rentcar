'use client';

import { useState } from 'react';
import { Car as CarIcon, Users, Wrench, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useScheduleStock } from '@/hooks/useSchedule';

function todayWibStr() {
  // "today" in Asia/Jakarta regardless of the browser's timezone.
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  total: number;
  down: number;
  used: number;
  free: number;
}

function SummaryCard({ icon, label, total, down, used, free }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 text-gray-700 font-medium mb-3">
        {icon}
        {label}
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-2xl font-semibold text-emerald-600">{free}</div>
          <div className="text-[11px] uppercase tracking-wide text-gray-400">Free</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-amber-600">{used}</div>
          <div className="text-[11px] uppercase tracking-wide text-gray-400">Dipakai</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-red-500">{down}</div>
          <div className="text-[11px] uppercase tracking-wide text-gray-400">Down</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-gray-900">{total}</div>
          <div className="text-[11px] uppercase tracking-wide text-gray-400">Total</div>
        </div>
      </div>
    </div>
  );
}

export default function StockTab() {
  const [date, setDate] = useState(todayWibStr());
  const { data, isLoading, isFetching } = useScheduleStock(date);

  const d = data?.drivers;
  const c = data?.cars;

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Tanggal (WIB)</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        {isFetching && <span className="text-xs text-gray-400 pb-2">memuat…</span>}
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-400">Memuat ketersediaan…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SummaryCard
              icon={<Users className="h-4 w-4" />}
              label="Driver"
              total={d?.total ?? 0}
              down={d?.down ?? 0}
              used={d?.used ?? 0}
              free={d?.free ?? 0}
            />
            <SummaryCard
              icon={<CarIcon className="h-4 w-4" />}
              label="Mobil"
              total={c?.total ?? 0}
              down={c?.down ?? 0}
              used={c?.used ?? 0}
              free={c?.free ?? 0}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Drivers */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users className="h-4 w-4" /> Driver
              </h3>
              <UnitGroup title="Free" tone="emerald" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                {(d?.free_list ?? []).map((x) => (
                  <li key={x.id} className="text-sm text-gray-700">{x.name}</li>
                ))}
                {(d?.free_list?.length ?? 0) === 0 && <Empty />}
              </UnitGroup>
              <UnitGroup title="Dipakai" tone="amber">
                {(d?.used_list ?? []).map((x) => (
                  <li key={x.id} className="text-sm text-gray-700">
                    <span className="font-medium">{x.name}</span>
                    <ul className="ml-3 mt-0.5 space-y-0.5">
                      {x.bookings.map((b) => (
                        <li key={b.line_id} className="text-xs text-gray-500">
                          {b.order_code ? `${b.order_code} · ` : ''}{b.customer_name ?? ''} · {b.route}{' '}
                          <Badge variant="outline" className="text-[10px] py-0">{b.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
                {(d?.used_list?.length ?? 0) === 0 && <Empty />}
              </UnitGroup>
              {(d?.down ?? 0) > 0 && (
                <UnitGroup title="Down (Off)" tone="red" icon={<Wrench className="h-3.5 w-3.5" />}>
                  {(d?.down_list ?? []).map((x) => (
                    <li key={x.id} className="text-sm text-gray-500">{x.name}</li>
                  ))}
                </UnitGroup>
              )}
            </div>

            {/* Cars */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CarIcon className="h-4 w-4" /> Mobil
              </h3>
              <UnitGroup title="Free" tone="emerald" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                {(c?.free_list ?? []).map((x) => (
                  <li key={x.id} className="text-sm text-gray-700">
                    {x.model} <span className="text-xs text-gray-400">{x.plate_number}</span>
                  </li>
                ))}
                {(c?.free_list?.length ?? 0) === 0 && <Empty />}
              </UnitGroup>
              <UnitGroup title="Dipakai" tone="amber">
                {(c?.used_list ?? []).map((x) => (
                  <li key={x.id} className="text-sm text-gray-700">
                    <span className="font-medium">{x.model}</span>{' '}
                    <span className="text-xs text-gray-400">{x.plate_number}</span>
                    <ul className="ml-3 mt-0.5 space-y-0.5">
                      {x.bookings.map((b) => (
                        <li key={b.line_id} className="text-xs text-gray-500">
                          {b.order_code ? `${b.order_code} · ` : ''}{b.customer_name ?? ''} · {b.route}{' '}
                          <Badge variant="outline" className="text-[10px] py-0">{b.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
                {(c?.used_list?.length ?? 0) === 0 && <Empty />}
              </UnitGroup>
              {(c?.down ?? 0) > 0 && (
                <UnitGroup title="Down (Maintenance)" tone="red" icon={<Wrench className="h-3.5 w-3.5" />}>
                  {(c?.down_list ?? []).map((x) => (
                    <li key={x.id} className="text-sm text-gray-500">
                      {x.model} <span className="text-xs text-gray-400">{x.plate_number}</span>
                    </li>
                  ))}
                </UnitGroup>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Empty() {
  return <li className="text-xs text-gray-300 italic">—</li>;
}

function UnitGroup({
  title,
  tone,
  icon,
  children,
}: {
  title: string;
  tone: 'emerald' | 'amber' | 'red';
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const toneCls = {
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-500',
  }[tone];
  return (
    <div>
      <div className={`text-xs font-semibold flex items-center gap-1 mb-1 ${toneCls}`}>
        {icon}
        {title}
      </div>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}
