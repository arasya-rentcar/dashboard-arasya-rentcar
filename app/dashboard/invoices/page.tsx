'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ExternalLink } from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrders } from '@/hooks/useOrders';
import { formatCurrency } from '@/lib/utils';
import { InvoiceStatus, InvoiceType } from '@/types';

const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  ISSUED: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const TYPE_STYLES: Record<InvoiceType, string> = {
  DP: 'border-blue-200 text-blue-700 bg-blue-50',
  SETTLEMENT: 'border-amber-200 text-amber-700 bg-amber-50',
  FULL: 'border-emerald-200 text-emerald-700 bg-emerald-50',
};

const TYPE_LABELS: Record<InvoiceType, string> = {
  DP: 'DP',
  SETTLEMENT: 'Settlement',
  FULL: 'Full',
};

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const { data: orders, isLoading } = useOrders();

  // Flatten: each order can have multiple invoices
  const invoices = orders?.flatMap((o) =>
    o.invoices.map((inv) => ({ ...inv, order: o }))
  );

  const filtered = invoices?.filter(
    (inv) =>
      search === '' ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.order.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell title="Invoices">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search invoices…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice #</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Type</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                    No invoices yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered?.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-mono text-sm text-gray-900 font-medium">
                      {inv.invoice_number}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {inv.order.customer_name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className={`text-xs ${TYPE_STYLES[inv.invoice_type]}`}
                      >
                        {TYPE_LABELS[inv.invoice_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-gray-900">
                      {formatCurrency(inv.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${INVOICE_STATUS_STYLES[inv.status]}`}
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/orders/${inv.order.id}`}>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Order
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filtered && filtered.length > 0 && (
          <p className="text-xs text-gray-400 text-right">
            {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </DashboardShell>
  );
}
