'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
import TablePagination from '@/components/dashboard/TablePagination';
import { useCustomer, useUpdateCustomer } from '@/hooks/useCustomers';
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/utils';

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [ordersPage, setOrdersPage] = useState(1);
  const { data: customer, isLoading } = useCustomer(id, ordersPage);
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
    const t = newTag.trim();
    if (!t) return;
    if (tags.includes(t)) {
      setNewTag('');
      return;
    }
    setTags([...tags, t]);
    setNewTag('');
    setDirty(true);
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
    setDirty(true);
  }

  async function save() {
    try {
      await updateMutation.mutateAsync({ id, data: { tags, notes } });
      toast.success('Customer updated');
      setDirty(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (isLoading && !customer) {
    return (
      <DashboardShell title="Customer">
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      </DashboardShell>
    );
  }
  if (!customer) {
    return (
      <DashboardShell title="Customer">
        <p className="text-sm text-gray-500">Customer not found.</p>
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
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Customers
        </Link>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Total Orders" value={String(customer.total_orders)} />
          <Stat label="Total Spent" value={formatCurrency(customer.total_spent)} />
          <Stat
            label="First Order"
            value={customer.first_order_at ? formatDate(customer.first_order_at) : '-'}
          />
          <Stat
            label="Last Order"
            value={customer.last_order_at ? formatDate(customer.last_order_at) : '-'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Profile + loyalty */}
          <Card className="border border-gray-200 shadow-none lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="h-4 w-4 text-gray-400" /> {customer.phone}
              </div>
              {customer.email && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="h-4 w-4 text-gray-400" /> {customer.email}
                </div>
              )}

              {/* Loyalty: tags + notes */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.length === 0 && (
                    <span className="text-xs text-gray-400">No tags</span>
                  )}
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 pl-2.5 pr-1 py-0.5 text-xs"
                    >
                      {t}
                      <button
                        onClick={() => removeTag(t)}
                        className="text-indigo-300 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Input
                    placeholder="Add tag (VIP, Corporate…)"
                    className="h-8 text-xs"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={addTag}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">
                  Loyalty / Notes
                </p>
                <Textarea
                  placeholder="e.g. gave free wash on 10th order…"
                  className="text-sm min-h-20"
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
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Order history */}
          <Card className="border border-gray-200 shadow-none lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Order History ({op.total})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <Th className="w-10">No</Th>
                    <Th>Date</Th>
                    <Th className="hidden sm:table-cell">Route</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Price</Th>
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
                        No orders.
                      </TableCell>
                    </TableRow>
                  ) : (
                    customer.orders.map((o, i) => (
                      <TableRow key={o.id} className="hover:bg-gray-50/50">
                        <TableCell className="text-xs text-gray-400 tabular-nums">
                          {start + i + 1}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(o.order_date)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 hidden sm:table-cell max-w-48 truncate">
                          {o.pickup_location} → {o.dropoff_location}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {o.order_status}
                          </Badge>
                          {o.is_external && (
                            <Badge
                              variant="outline"
                              className="text-[10px] ml-1 bg-purple-50 text-purple-700 border-purple-200"
                            >
                              Ext
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-900 text-right tabular-nums">
                          {formatCurrency(o.final_price)}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/orders/${o.id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Open
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
                label="orders"
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
        <p className="text-base font-semibold text-gray-900">{value}</p>
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
