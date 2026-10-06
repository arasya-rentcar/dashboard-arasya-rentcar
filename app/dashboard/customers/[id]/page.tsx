'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, X, Plus, Save, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import CustomerIdentityCard from '@/components/customers/CustomerIdentityCard';
import QueryError from '@/components/dashboard/QueryError';
import TablePagination from '@/components/dashboard/TablePagination';
import { useCustomer, useUpdateCustomer } from '@/hooks/useCustomers';
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/utils';

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const tx = useTranslations('customerDetail');
  const tos = useTranslations('orderStatus');
  const [ordersPage, setOrdersPage] = useState(1);
  const { data: customer, isLoading, isError, error, refetch } = useCustomer(id, ordersPage);
  const updateMutation = useUpdateCustomer();

  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (customer) {
      setTags(customer.tags ?? []);
      setNotes(customer.notes ?? '');
      setDirty(false);
    }
  }, [customer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function addTag() {
    const tag = newTag.trim();
    if (!tag) return;
    if (tags.includes(tag)) {
      setNewTag('');
      return;
    }
    setTags([...tags, tag]);
    setNewTag('');
    setDirty(true);
  }

  function removeTag(tag: string) {
    setTags(tags.filter((x) => x !== tag));
    setDirty(true);
  }

  async function save() {
    try {
      await updateMutation.mutateAsync({ id, data: { tags, notes } });
      toast.success(tx('okUpdated'));
      setDirty(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (isLoading && !customer) {
    return (
      <DashboardShell title={tx('title')}>
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      </DashboardShell>
    );
  }
  if (!customer) {
    // A network / server error used to read "customer not found".
    const status = (error as { response?: { status?: number } } | null)?.response?.status;
    return (
      <DashboardShell title={tx('title')}>
        {isError && status !== 404 ? (
          <QueryError onRetry={() => refetch()} />
        ) : (
          <p className="text-sm text-gray-500">{tx('notFound')}</p>
        )}
      </DashboardShell>
    );
  }

  const op = customer.orders_pagination;
  const start = (op.page - 1) * op.page_size;

  return (
    <DashboardShell title={customer.name}>
      <div className="space-y-5">
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" /> {tx('backToCustomers')}
        </Link>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label={tx('totalOrders')} value={String(customer.total_orders)} />
          <Stat label={tx('totalSpent')} value={formatCurrency(customer.total_spent)} />
          <Stat
            label={tx('firstOrder')}
            value={customer.first_order_at ? formatDate(customer.first_order_at) : '-'}
          />
          <Stat
            label={tx('lastOrder')}
            value={customer.last_order_at ? formatDate(customer.last_order_at) : '-'}
          />
        </div>

        <CustomerIdentityCard customer={customer} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Profile + loyalty */}
          <Card className="border border-gray-200 shadow-none lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {tx('profile')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                <span className="min-w-0 break-words">{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                  <span className="min-w-0 break-all">{customer.email}</span>
                </div>
              )}

              {/* Loyalty: tags + notes */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">{tx('tags')}</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.length === 0 && (
                    <span className="text-xs text-gray-400">{tx('noTags')}</span>
                  )}
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex max-w-full items-center gap-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 pl-2.5 pr-0.5 py-0.5 text-xs"
                    >
                      <span className="min-w-0 truncate" title={tag}>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        aria-label={tx('removeTag', { tag })}
                        title={tx('removeTag', { tag })}
                        className="flex size-6 shrink-0 items-center justify-center rounded-full text-indigo-300 hover:bg-indigo-100 hover:text-red-500 sm:size-5"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Input
                    placeholder={tx('addTagPlaceholder')}
                    aria-label={tx('addTag')}
                    className="h-9 sm:h-8 sm:text-xs"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 shrink-0 px-0 sm:h-8 sm:w-8"
                    onClick={addTag}
                    disabled={!newTag.trim()}
                    aria-label={tx('addTag')}
                    title={tx('addTag')}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">
                  {tx('loyaltyNotes')}
                </p>
                <Textarea
                  placeholder={tx('notesPlaceholder')}
                  aria-label={tx('loyaltyNotes')}
                  className="min-h-20"
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>

              <Button
                className="w-full"
                onClick={save}
                disabled={!dirty || updateMutation.isPending}
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {updateMutation.isPending ? tx('saving') : tx('saveChanges')}
              </Button>
            </CardContent>
          </Card>

          {/* Order history */}
          <Card className="border border-gray-200 shadow-none lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {tx('orderHistory', { count: op.total })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <Th className="hidden w-10 sm:table-cell">{tx('colNo')}</Th>
                    <Th>{tx('colDate')}</Th>
                    <Th className="hidden sm:table-cell">{tx('colRoute')}</Th>
                    <Th>{tx('colStatus')}</Th>
                    <Th className="text-right">{tx('colPrice')}</Th>
                    <Th></Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.orders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-gray-400 text-sm"
                      >
                        {tx('noOrders')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    customer.orders.map((o, i) => (
                      <TableRow key={o.id} className="hover:bg-gray-50/50">
                        <TableCell className="hidden text-xs text-gray-400 tabular-nums sm:table-cell">
                          {start + i + 1}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(o.order_date)}
                        </TableCell>
                        <TableCell
                          className="text-sm text-gray-600 hidden sm:table-cell max-w-48 truncate"
                          title={`${o.pickup_location} → ${o.dropoff_location}`}
                        >
                          {o.pickup_location} → {o.dropoff_location}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {tos(o.order_status)}
                          </Badge>
                          {o.is_external && (
                            <Badge
                              variant="outline"
                              className="text-[10px] ml-1 bg-purple-50 text-purple-700 border-purple-200"
                            >
                              {tx('ext')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-900 text-right tabular-nums">
                          {formatCurrency(o.final_price)}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/orders/${o.id}`}
                            className="inline-flex min-h-8 items-center text-xs text-blue-600 hover:underline"
                          >
                            {tx('open')}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                page={op.page}
                pageCount={op.page_count}
                total={op.total}
                start={start}
                pageSize={op.page_size}
                onPageChange={setOrdersPage}
                label={tx('paginationLabel')}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border border-gray-200 shadow-none">
      <CardContent className="p-3">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="break-words text-base font-semibold tabular-nums text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function Th({
  children,
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHead
      className={`text-xs font-medium text-gray-500 uppercase tracking-wide ${className}`}
    >
      {children}
    </TableHead>
  );
}
