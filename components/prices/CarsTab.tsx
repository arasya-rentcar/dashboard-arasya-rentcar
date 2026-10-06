'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreatePriceCar, useReloadPriceList, useUpdatePriceCar } from '@/hooks/usePriceList';
import { getErrorMessage } from '@/lib/utils';
import type { PriceCar } from '@/types';
import { DialogActions, DialogShell, isStaleConflict } from './common';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// Same limit as the API.
const ORDER_MAX = 10_000;

/** The website fleet: the cars that have a row in every price table. */
export default function CarsTab({ cars }: { cars: PriceCar[] }) {
  const t = useTranslations('priceList');
  // null = closed, 'new' = adding.
  const [editing, setEditing] = useState<PriceCar | 'new' | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl text-sm text-gray-500">{t('carsDesc')}</p>
        <Button onClick={() => setEditing('new')} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" /> {t('addCar')}
        </Button>
      </div>
      {cars.length === 0 ? (
        <Card className="border border-dashed border-gray-200 shadow-none">
          <CardContent className="py-10 text-center text-sm text-gray-400">{t('noCars')}</CardContent>
        </Card>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          {cars.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_3rem_auto]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900" title={c.name}>{c.name}</p>
                <p className="truncate font-mono text-[11px] text-gray-400" title={c.slug}>{c.slug}</p>
              </div>
              <Button size="icon" variant="ghost" aria-label={t('edit')} onClick={() => setEditing(c)} className="sm:order-last">
                <Pencil className="h-4 w-4" />
              </Button>
              <p className="col-span-2 min-w-0 truncate text-xs text-gray-600 sm:col-span-1" title={c.price_class ?? undefined}>
                {c.price_class ?? <span className="text-gray-400">{t('noClass')}</span>}
              </p>
              <p className="col-span-2 min-w-0 truncate text-xs text-gray-500 empty:hidden sm:col-span-1 sm:empty:block" title={c.note ?? undefined}>{c.note ?? ''}</p>
              <p className="col-span-2 text-xs tabular-nums text-gray-400 sm:col-span-1">
                <span className="sm:hidden">{t('order')} </span>
                {c.sort_order}
              </p>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <CarDialog
          // The row as it is now (after a reload), so a retry sends its current updated_at.
          car={editing === 'new' ? null : (cars.find((c) => c.id === editing.id) ?? editing)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function CarDialog({ car, onClose }: { car: PriceCar | null; onClose: () => void }) {
  const t = useTranslations('priceList');
  const create = useCreatePriceCar();
  const update = useUpdatePriceCar();
  const reload = useReloadPriceList();
  const [slug, setSlug] = useState('');
  const [name, setName] = useState(car?.name ?? '');
  const [priceClass, setPriceClass] = useState(car?.price_class ?? '');
  const [note, setNote] = useState(car?.note ?? '');
  const [order, setOrder] = useState(car ? String(car.sort_order) : '');
  const [error, setError] = useState<string | null>(null);
  const busy = create.isPending || update.isPending;

  async function save() {
    if (!name.trim()) return setError(t('errCarName'));
    try {
      if (car) {
        const sortOrder = Number(order);
        if (order === '' || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > ORDER_MAX) {
          return setError(t('errOrder'));
        }
        setError(null);
        await update.mutateAsync({
          id: car.id,
          data: {
            name: name.trim(),
            price_class: priceClass.trim() || null,
            note: note.trim() || null,
            sort_order: sortOrder,
            expected_updated_at: car.updated_at,
          },
        });
        toast.success(t('okCarSaved'));
      } else {
        const s = slug.trim().toLowerCase();
        if (!SLUG.test(s)) return setError(t('errSlug'));
        setError(null);
        await create.mutateAsync({ slug: s, name: name.trim(), price_class: priceClass.trim() || null });
        toast.success(t('okCarAdded'));
      }
      onClose();
    } catch (err) {
      // Edit, 409 with conflict_ids: another admin changed this car meanwhile.
      // The list is loaded again; `car` then is the current row, so Simpan once
      // more saves over it on purpose.
      if (car && isStaleConflict(err)) {
        await reload();
        return setError(t('conflictCarReloaded'));
      }
      setError(getErrorMessage(err));
    }
  }

  return (
    <DialogShell title={car ? t('editCarTitle') : t('addCarTitle')} onClose={onClose}>
      {car ? (
        <p className="font-mono text-xs text-gray-500">{car.slug}</p>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="car_slug">{t('slug')}</Label>
          <Input
            id="car_slug"
            className="font-mono"
            maxLength={80}
            placeholder={t('slugPlaceholder')}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-gray-500">{t('slugHint')}</p>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="car_name">{t('carName')}</Label>
        <Input id="car_name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="car_class">{t('priceClass')}</Label>
        <Input id="car_class" maxLength={60} placeholder={t('priceClassPlaceholder')} value={priceClass} onChange={(e) => setPriceClass(e.target.value)} />
        <p className="text-xs text-gray-500">{t('priceClassHint')}</p>
      </div>
      {car && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="car_note">{t('noteOptional')}</Label>
            <Textarea id="car_note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="car_order">{t('order')}</Label>
            <Input id="car_order" inputMode="numeric" className="w-28 tabular-nums" value={order} onChange={(e) => setOrder(e.target.value.replace(/\D/g, '').slice(0, 5))} max={ORDER_MAX} aria-invalid={Number(order) > ORDER_MAX || undefined} />
            <p className="text-xs text-gray-500">{t('orderHint')}</p>
          </div>
        </>
      )}
      {!car && <p className="text-xs text-gray-500">{t('newCarHint')}</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <DialogActions busy={busy} onClose={onClose} onConfirm={save} label={t('save')} />
    </DialogShell>
  );
}
