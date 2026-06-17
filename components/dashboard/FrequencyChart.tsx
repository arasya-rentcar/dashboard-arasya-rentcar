'use client';

import { Card, CardContent } from '@/components/ui/card';

export interface FreqItem {
  label: string;
  count: number;
}

interface Props {
  title: string;
  subtitle?: string;
  items: FreqItem[];
  loading?: boolean;
  topN?: number;
  barClass?: string;
}

export default function FrequencyChart({
  title,
  subtitle,
  items,
  loading = false,
  topN = 8,
  barClass = 'bg-gray-900',
}: Props) {
  const sorted = [...items].sort((a, b) => b.count - a.count).slice(0, topN);
  const max = sorted.reduce((m, i) => Math.max(m, i.count), 0) || 1;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-sm font-medium text-gray-500">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      <Card className="shadow-none border border-gray-200">
        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : sorted.length > 0 ? (
            <div className="space-y-3">
              {sorted.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 truncate text-sm text-gray-700">
                    {item.label}
                  </div>
                  <div className="flex-1 h-6 rounded-md bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-md ${barClass} transition-all`}
                      style={{ width: `${(item.count / max) * 100}%` }}
                    />
                  </div>
                  <div className="w-8 shrink-0 text-right text-sm font-medium tabular-nums text-gray-900">
                    {item.count}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-400">
              No rental data yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
