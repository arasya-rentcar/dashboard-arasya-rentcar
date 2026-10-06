"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pencil, Check, RotateCcw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useMarkPayablePaid,
  useMarkPayableUnpaid,
} from "@/hooks/usePayables";
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import { Payable, PayableKind } from "@/types";
import PayableEditDialog from "./PayableEditDialog";

interface Props {
  items: Payable[];
  kind: PayableKind;
  loading?: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
}

export default function PayablesTable({
  items,
  kind,
  loading,
  selected,
  onToggle,
  onToggleAll,
}: Props) {
  const t = useTranslations("payables");
  const tt = useTranslations("terms");
  const tc = useTranslations("common");
  const markPaid = useMarkPayablePaid();
  const markUnpaid = useMarkPayableUnpaid();
  const [editing, setEditing] = useState<Payable | null>(null);

  const unpaidIds = items.filter((p) => p.status === "UNPAID").map((p) => p.id);
  const allSelected =
    unpaidIds.length > 0 && unpaidIds.every((id) => selected.has(id));
  // Failures used to be silent (no onError anywhere on these mutations).
  const onFail = { onError: (err: unknown) => toast.error(getErrorMessage(err)) };

  return (
    <>
      {/* Phones / tablets: one card per payable, so amount, status and the
          Pay button are visible without scrolling a 10-column table sideways. */}
      <div className="space-y-2 xl:hidden">
        {!loading && unpaidIds.length > 0 && (
          <label className="flex min-h-9 items-center gap-2.5 px-1 text-sm text-gray-600">
            <input
              type="checkbox"
              className="size-4 cursor-pointer"
              checked={allSelected}
              onChange={() => onToggleAll(unpaidIds)}
            />
            {t('selectAll')}
          </label>
        )}
        {loading ? (
          <p className="rounded-lg border border-gray-100 bg-white py-8 text-center text-sm text-gray-400">
            {t('loading')}
          </p>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-gray-100 bg-white py-8 text-center text-sm text-gray-400">
            {t('noPayables')}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {items.map((p) => {
              const route = [p.service_item?.pickup_location, p.service_item?.dropoff_location]
                .filter(Boolean)
                .join(" → ");
              const isPaid = p.status === "PAID";
              const name = p.driver?.name || p.vendor?.name || "-";
              const reimburse = Number(p.reimburse_amount ?? 0);
              const advance = Number(p.advance_amount ?? 0);
              const extras = Number(p.extras_amount);
              return (
                <li
                  key={p.id}
                  className={`flex min-w-0 flex-col gap-2 rounded-lg border bg-white p-3 ${
                    selected.has(p.id) ? "border-emerald-300 ring-1 ring-emerald-200" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {!isPaid && (
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 shrink-0 cursor-pointer"
                        checked={selected.has(p.id)}
                        onChange={() => onToggle(p.id)}
                        aria-label={t('selectRow', { name })}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium text-gray-900">{name}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                        <span>{p.service_date ? formatDate(p.service_date) : "-"}</span>
                        {p.order?.order_code && (
                          <Link
                            href={`/dashboard/orders/${p.order_id}`}
                            className="inline-flex min-h-6 items-center gap-1 text-blue-600 hover:underline"
                          >
                            {p.order.order_code}
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </Link>
                        )}
                      </p>
                      {route && (
                        <p className="truncate text-xs text-gray-500" title={route}>
                          {route}
                        </p>
                      )}
                    </div>
                    {isPaid ? (
                      <Badge className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700">
                        {t('paid')}
                      </Badge>
                    ) : (
                      <Badge className="shrink-0 border-amber-200 bg-amber-50 text-amber-700">
                        {t('unpaid')}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-0.5 rounded-md bg-gray-50 px-2.5 py-2 text-xs">
                    <div className="flex justify-between gap-3 text-gray-500">
                      <span>{t('colBase')}</span>
                      <span className="tabular-nums">{formatCurrency(p.base_amount)}</span>
                    </div>
                    {extras !== 0 && (
                      <div className="flex justify-between gap-3 text-gray-500">
                        <span>{t('colOthers')}</span>
                        <span className="tabular-nums">{formatCurrency(p.extras_amount)}</span>
                      </div>
                    )}
                    {reimburse !== 0 && (
                      <div className="flex justify-between gap-3 text-emerald-700">
                        <span>{t('reimburseShort')}</span>
                        <span className="tabular-nums">+ {formatCurrency(reimburse)}</span>
                      </div>
                    )}
                    {advance !== 0 && (
                      <div className="flex justify-between gap-3 text-amber-700">
                        <span>{t('advanceShort')}</span>
                        <span className="tabular-nums">− {formatCurrency(advance)}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-3 border-t border-gray-200 pt-1 text-sm font-semibold text-gray-900">
                      <span>{t('colTotal')}</span>
                      <span className="tabular-nums">{formatCurrency(p.total_amount)}</span>
                    </div>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-end gap-2">
                    {isPaid && p.paid_at && (
                      <span className="mr-auto text-xs text-emerald-700">
                        {t('paid')} · {formatDate(p.paid_at)}
                      </span>
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 text-gray-500"
                      onClick={() => setEditing(p)}
                      aria-label={tc('edit')}
                      title={tc('edit')}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    {isPaid ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 text-gray-500 hover:text-amber-600"
                        disabled={markUnpaid.isPending}
                        onClick={() => markUnpaid.mutate(p.id, onFail)}
                        aria-label={t('markUnpaid')}
                        title={t('markUnpaid')}
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 gap-1 bg-emerald-600 hover:bg-emerald-700"
                        disabled={markPaid.isPending}
                        onClick={() => markPaid.mutate({ id: p.id, data: {} }, onFail)}
                      >
                        <Check className="h-4 w-4" aria-hidden="true" /> {t('pay')}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-gray-100 xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  className="size-4 cursor-pointer align-middle disabled:cursor-default"
                  checked={allSelected}
                  disabled={unpaidIds.length === 0}
                  onChange={() => onToggleAll(unpaidIds)}
                  aria-label={t('selectAll')}
                />
              </TableHead>
              <TableHead>{t('colDate')}</TableHead>
              <TableHead>{kind === "DRIVER" ? tt('driver') : tt('vendor')}</TableHead>
              <TableHead>{t('colOrder')}</TableHead>
              <TableHead>{t('colTrip')}</TableHead>
              <TableHead className="text-right">{t('colBase')}</TableHead>
              <TableHead className="text-right">{t('colOthers')}</TableHead>
              <TableHead className="text-right">{t('colTotal')}</TableHead>
              <TableHead>{t('colStatus')}</TableHead>
              <TableHead className="text-right">{t('colActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-gray-400">
                  {t('loading')}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-gray-400">
                  {t('noPayables')}
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => {
                const route = [
                  p.service_item?.pickup_location,
                  p.service_item?.dropoff_location,
                ]
                  .filter(Boolean)
                  .join(" → ");
                const isPaid = p.status === "PAID";
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      {!isPaid && (
                        <input
                          type="checkbox"
                          className="size-4 cursor-pointer align-middle"
                          checked={selected.has(p.id)}
                          onChange={() => onToggle(p.id)}
                          aria-label={t('selectRow', { name: p.driver?.name || p.vendor?.name || "-" })}
                        />
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {p.service_date ? formatDate(p.service_date) : "-"}
                    </TableCell>
                    <TableCell className="min-w-[10rem] whitespace-normal text-sm font-medium text-gray-800">
                      {p.driver?.name || p.vendor?.name || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.order?.order_code ? (
                        <Link
                          href={`/dashboard/orders/${p.order_id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          {p.order.order_code}
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm text-gray-600" title={route || undefined}>
                      {route || "-"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(p.base_amount)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-500">
                      {Number(p.extras_amount) === 0 &&
                      !Number(p.reimburse_amount ?? 0) &&
                      !Number(p.advance_amount ?? 0)
                        ? "-"
                        : null}
                      {Number(p.extras_amount) !== 0 && (
                        <div>{formatCurrency(p.extras_amount)}</div>
                      )}
                      {/* Driver: reimbursed trip costs (+) and uang jalan (−). */}
                      {Number(p.reimburse_amount ?? 0) !== 0 && (
                        <div className="text-[11px] text-emerald-700">
                          + {formatCurrency(p.reimburse_amount ?? 0)} {t('reimburseShort')}
                        </div>
                      )}
                      {Number(p.advance_amount ?? 0) !== 0 && (
                        <div className="text-[11px] text-amber-700">
                          − {formatCurrency(p.advance_amount ?? 0)} {t('advanceShort')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">
                      {formatCurrency(p.total_amount)}
                    </TableCell>
                    <TableCell>
                      {isPaid ? (
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                          {t('paid')}
                          {p.paid_at ? ` · ${formatDate(p.paid_at)}` : ""}
                        </Badge>
                      ) : (
                        <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                          {t('unpaid')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-gray-400 hover:text-gray-900"
                          onClick={() => setEditing(p)}
                          aria-label={tc('edit')}
                          title={tc('edit')}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        {isPaid ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-400 hover:text-amber-600"
                            type="button"
                            title={t('markUnpaid')}
                            aria-label={t('markUnpaid')}
                            disabled={markUnpaid.isPending}
                            onClick={() => markUnpaid.mutate(p.id, onFail)}
                          >
                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 gap-1 bg-emerald-600 text-xs hover:bg-emerald-700"
                            disabled={markPaid.isPending}
                            onClick={() =>
                              markPaid.mutate({ id: p.id, data: {} }, onFail)
                            }
                          >
                            <Check className="h-3 w-3" aria-hidden="true" /> {t('pay')}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PayableEditDialog
        payable={editing}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
      />
    </>
  );
}
