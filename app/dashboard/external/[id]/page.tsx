'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Phone,
  Car,
  ClipboardList,
  Wallet,
  Pencil,
  User,
  MapPin,
  Landmark,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import TablePagination from '@/components/dashboard/TablePagination';
import {
  useExternalVendor,
  useAddVendorCar,
  useDeleteVendorCar,
  useUpdateVendor,
} from '@/hooks/useExternalVendors';
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/utils';
import VendorExtraFields, {
  emptyVendorExtra,
  vendorExtraPayload,
  type VendorExtraForm,
} from '@/components/partners/VendorExtraFields';
import PartnerDetailView from '@/components/partners/PartnerDetailView';
import VendorRevenuePanel from '@/components/revenue/VendorRevenuePanel';
import { useVendorDetail2 } from '@/hooks/useExternalVendors';

type Tab = 'cars' | 'orders' | 'finance';

export default function VendorDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const tx = useTranslations('vendorDetail');
  const tos = useTranslations('orderStatus');
  const [tab, setTab] = useState<Tab>('cars');
  const [carsPage, setCarsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [addCarOpen, setAddCarOpen] = useState(false);
  const [carForm, setCarForm] = useState({ model: '', plate_number: '', notes: '' });

  const { data: vendor, isLoading } = useExternalVendor(id, {
    cars_page: carsPage,
    orders_page: ordersPage,
  });
  const tf = useTranslations('vendorFields');
  const updateMutation = useUpdateVendor();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', notes: '' });
  const [editExtra, setEditExtra] = useState<VendorExtraForm>(emptyVendorExtra);
  const addCarMutation = useAddVendorCar();
  const deleteCarMutation = useDeleteVendorCar();
  const { data: detail } = useVendorDetail2(tab === 'finance' ? id : undefined);

  async function handleAddCar() {
    if (!carForm.model.trim()) {
      toast.error(tx('errModelRequired'));
      return;
    }
    try {
      await addCarMutation.mutateAsync({
        id,
        data: {
          model: carForm.model.trim(),
          plate_number: carForm.plate_number.trim() || undefined,
          notes: carForm.notes.trim() || undefined,
        },
      });
      toast.success(tx('okCarAdded'));
      setCarForm({ model: '', plate_number: '', notes: '' });
      setAddCarOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function openEdit() {
    if (!vendor) return;
    setEditForm({
      name: vendor.name,
      phone: vendor.phone ?? '',
      notes: vendor.notes ?? '',
    });
    setEditExtra({
      pic_name: vendor.pic_name ?? '',
      area: vendor.area ?? '',
      bank_name: vendor.bank_name ?? '',
      bank_account: vendor.bank_account ?? '',
      bank_holder: vendor.bank_holder ?? '',
    });
    setEditOpen(true);
  }

  async function handleUpdate() {
    if (!editForm.name.trim()) {
      toast.error(tx('errNameRequired'));
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          name: editForm.name.trim(),
          phone: editForm.phone.trim() || null,
          notes: editForm.notes.trim() || null,
          ...vendorExtraPayload(editExtra),
        },
      });
      toast.success(tf('okUpdated'));
      setEditOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function copyAccount(v: string) {
    try {
      await navigator.clipboard.writeText(v);
      toast.success(tf('copied'));
    } catch {
      /* clipboard unavailable */
    }
  }

  async function handleDeleteCar(carId: string) {
    try {
      await deleteCarMutation.mutateAsync(carId);
      toast.success(tx('okCarRemoved'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (isLoading && !vendor) {
    return (
      <DashboardShell title={tx('title')}>
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      </DashboardShell>
    );
  }
  if (!vendor) {
    return (
      <DashboardShell title={tx('title')}>
        <p className="text-sm text-gray-500">{tx('notFound')}</p>
      </DashboardShell>
    );
  }

  const cp = vendor.cars_pagination;
  const op = vendor.orders_pagination;
  const carStart = (cp.page - 1) * cp.page_size;
  const orderStart = (op.page - 1) * op.page_size;

  return (
    <DashboardShell title={vendor.name}>
      <div className="space-y-5">
        <Link
          href="/dashboard/external"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> {tx('back')}
        </Link>

        {/* Header */}
        <Card className="border border-gray-200 shadow-none">
          <CardContent className="p-4 flex flex-wrap items-center gap-x-8 gap-y-2">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {vendor.name}
              </p>
              {vendor.phone && (
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {vendor.phone}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> {tf('edit')}
            </Button>
            <div className="flex items-center gap-6 ml-auto">
              <div className="text-center">
                <p className="text-xl font-semibold text-gray-900">
                  {cp.total}
                </p>
                <p className="text-xs text-gray-400">{tx('cars')}</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-purple-700">
                  {op.total}
                </p>
                <p className="text-xs text-gray-400">{tx('orders')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact + payout details (handy when paying vendor payables) */}
        <Card className="border border-gray-200 shadow-none">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-gray-700">
                <User className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-gray-400">{tf('pic')}:</span>{' '}
                {vendor.pic_name || '-'}
              </p>
              <p className="flex items-center gap-1.5 text-gray-700">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-gray-400">{tf('area')}:</span>{' '}
                {vendor.area || '-'}
              </p>
              {vendor.notes && (
                <p className="text-xs text-gray-500">{vendor.notes}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                <Landmark className="h-3.5 w-3.5 text-gray-400" /> {tf('bankTitle')}
              </p>
              {vendor.bank_name || vendor.bank_account || vendor.bank_holder ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium text-gray-900">
                    {vendor.bank_name || '-'}
                  </span>
                  <span className="font-mono text-gray-900">
                    {vendor.bank_account || '-'}
                  </span>
                  {vendor.bank_account && (
                    <button
                      type="button"
                      onClick={() => copyAccount(vendor.bank_account as string)}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <Copy className="h-3 w-3" /> {tf('copy')}
                    </button>
                  )}
                  <span className="text-gray-600">
                    a.n. {vendor.bank_holder || '-'}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-gray-400">{tf('bankEmpty')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Embedded vendor revenue (full report at /dashboard/revenue) */}
        <VendorRevenuePanel vendorId={id} />

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200">
          <TabButton
            active={tab === 'cars'}
            onClick={() => setTab('cars')}
            icon={<Car className="h-4 w-4" />}
            label={tx('tabCars', { count: cp.total })}
          />
          <TabButton
            active={tab === 'orders'}
            onClick={() => setTab('orders')}
            icon={<ClipboardList className="h-4 w-4" />}
            label={tx('tabOrders', { count: op.total })}
          />
          <TabButton
            active={tab === 'finance'}
            onClick={() => setTab('finance')}
            icon={<Wallet className="h-4 w-4" />}
            label={tx('tabFinance')}
          />
        </div>

        {/* Finance / Tagihan tab */}
        {tab === 'finance' && (
          detail ? (
            <PartnerDetailView
              kind="VENDOR"
              summary={detail.summary}
              trips={detail.trips}
              payments={detail.payments}
            />
          ) : (
            <p className="text-sm text-gray-400">{tx('loading')}</p>
          )
        )}

        {/* Cars tab */}
        {tab === 'cars' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setAddCarOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> {tx('addCar')}
              </Button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <Th className="w-10">{tx('colNo')}</Th>
                    <Th>{tx('colModel')}</Th>
                    <Th>{tx('colPlate')}</Th>
                    <Th className="text-right">{tx('colOrders')}</Th>
                    <Th></Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendor.cars.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-gray-400 text-sm"
                      >
                        {tx('noCars')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendor.cars.map((c, i) => (
                      <TableRow key={c.id} className="hover:bg-gray-50/50">
                        <TableCell className="text-xs text-gray-400 tabular-nums">
                          {carStart + i + 1}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-gray-800">
                          {c.model}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {c.plate_number || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="tabular-nums">
                            {c._count?.orders ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCar(c.id)}
                            disabled={(c._count?.orders ?? 0) > 0}
                            title={
                              (c._count?.orders ?? 0) > 0
                                ? tx('hasOrdersCannotDelete')
                                : tx('deleteCar')
                            }
                          >
                            <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              page={cp.page}
              pageCount={cp.page_count}
              total={cp.total}
              start={carStart}
              pageSize={cp.page_size}
              onPageChange={setCarsPage}
              label={tx('carsPaginationLabel')}
            />
          </div>
        )}

        {/* Orders tab */}
        {tab === 'orders' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <Th className="w-10">{tx('colNo')}</Th>
                    <Th>{tx('colDate')}</Th>
                    <Th>{tx('colCustomer')}</Th>
                    <Th className="hidden sm:table-cell">{tx('colCar')}</Th>
                    <Th>{tx('colStatus')}</Th>
                    <Th className="text-right">{tx('colPrice')}</Th>
                    <Th></Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendor.orders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-gray-400 text-sm"
                      >
                        {tx('noOrders')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendor.orders.map((o, i) => (
                      <TableRow key={o.id} className="hover:bg-gray-50/50">
                        <TableCell className="text-xs text-gray-400 tabular-nums">
                          {orderStart + i + 1}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(o.order_date)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-800">
                          {o.customer_name}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 hidden sm:table-cell">
                          {o.external_car
                            ? `${o.external_car.model}${o.external_car.plate_number ? ` (${o.external_car.plate_number})` : ''}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {tos(o.order_status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-900 text-right tabular-nums">
                          {formatCurrency(o.final_price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/dashboard/orders/${o.id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {tx('open')}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              page={op.page}
              pageCount={op.page_count}
              total={op.total}
              start={orderStart}
              pageSize={op.page_size}
              onPageChange={setOrdersPage}
              label={tx('ordersPaginationLabel')}
            />
          </div>
        )}
      </div>

      {/* Add car dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tf('editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">
                {tx('nameRequired')}
              </label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">
                {tx('phone')}
              </label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <VendorExtraFields value={editExtra} onChange={setEditExtra} />
            <div>
              <label className="text-xs font-medium text-gray-500">
                {tx('notes')}
              </label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? tf('saving') : tf('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addCarOpen} onOpenChange={setAddCarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tx('addCarFor', { name: vendor.name })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">
                {tx('modelRequired')}
              </label>
              <Input
                value={carForm.model}
                onChange={(e) =>
                  setCarForm({ ...carForm, model: e.target.value })
                }
                placeholder={tx('modelPlaceholder')}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">{tx('plate')}</label>
              <Input
                value={carForm.plate_number}
                onChange={(e) =>
                  setCarForm({ ...carForm, plate_number: e.target.value })
                }
                placeholder={tx('platePlaceholder')}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">{tx('notes')}</label>
              <Input
                value={carForm.notes}
                onChange={(e) =>
                  setCarForm({ ...carForm, notes: e.target.value })
                }
                placeholder={tx('optional')}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleAddCar}
              disabled={addCarMutation.isPending}
            >
              {addCarMutation.isPending ? tx('adding') : tx('addCar')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {icon}
      {label}
    </button>
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
