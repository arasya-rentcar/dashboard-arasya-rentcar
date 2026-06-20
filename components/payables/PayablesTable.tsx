"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pencil, Check, RotateCcw, ExternalLink } from "lucide-react";
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
import { formatCurrency, formatDate } from "@/lib/utils";
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
  const markPaid = useMarkPayablePaid();
  const markUnpaid = useMarkPayableUnpaid();
  const [editing, setEditing] = useState<Payable | null>(null);

  const unpaidIds = items.filter((p) => p.status === "UNPAID").map((p) => p.id);
  const allSelected =
    unpaidIds.length > 0 && unpaidIds.every((id) => selected.has(id));

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onToggleAll(unpaidIds)}
                  aria-label="select all"
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
                          checked={selected.has(p.id)}
                          onChange={() => onToggle(p.id)}
                          aria-label="select row"
                        />
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {p.service_date ? formatDate(p.service_date) : "-"}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-800">
                      {p.driver?.name || p.vendor?.name || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.order?.order_code ? (
                        <Link
                          href={`/dashboard/orders/${p.order_id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          {p.order.order_code}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm text-gray-600">
                      {route || "-"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(p.base_amount)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-500">
                      {Number(p.extras_amount) !== 0
                        ? formatCurrency(p.extras_amount)
                        : "-"}
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
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-gray-400 hover:text-gray-900"
                          onClick={() => setEditing(p)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isPaid ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-400 hover:text-amber-600"
                            title={t('markUnpaid')}
                            disabled={markUnpaid.isPending}
                            onClick={() => markUnpaid.mutate(p.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-8 gap-1 bg-emerald-600 text-xs hover:bg-emerald-700"
                            disabled={markPaid.isPending}
                            onClick={() =>
                              markPaid.mutate({ id: p.id, data: {} })
                            }
                          >
                            <Check className="h-3 w-3" /> {t('pay')}
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
