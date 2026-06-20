'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Phone, Car, ClipboardList, Wallet } from 'lucide-react';
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
} from '@/hooks/useExternalVendors';
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/utils';
import PartnerDetailView from '@/components/partners/PartnerDetailView';
import VendorRevenuePanel from '@/components/revenue/VendorRevenuePanel';
import { useVendorDetail2 } from '@/hooks/useExternalVendors';

type Tab = 'cars' | 'orders' | 'finance';

export default function VendorDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [tab, setTab] = useState<Tab>('cars');
  const [carsPage, setCarsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [addCarOpen, setAddCarOpen] = useState(false);
  const [carForm, setCarForm] = useState({ model: '', plate_number: '', notes: '' });

  const { data: vendor, isLoading } = useExternalVendor(id, {
    cars_page: carsPage,
    orders_page: ordersPage,
  });
  const addCarMutation = useAddVendorCar();
  const deleteCarMutation = useDeleteVendorCar();
  const { data: detail } = useVendorDetail2(tab === 'finance' ? id : undefined);

  async function handleAddCar() {
    if (!carForm.model.trim()) {
      toast.error('Car model is required.');
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
      toast.success('Car added');
      setCarForm({ model: '', plate_number: '', notes: '' });
      setAddCarOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDeleteCar(carId: string) {
    try {
      await deleteCarMutation.mutateAsync(carId);
      toast.success('Car removed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (isLoading && !vendor) {
    return (
      <DashboardShell title="Vendor">
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      </DashboardShell>
    );
  }
  if (!vendor) {
    return (
      <DashboardShell title="Vendor">
        <p className="text-sm text-gray-500">Vendor not found.</p>
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
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to External Vendors
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
            <div className="flex items-center gap-6 ml-auto">
              <div className="text-center">
                <p className="text-xl font-semibold text-gray-900">
                  {cp.total}
                </p>
                <p className="text-xs text-gray-400">Cars</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-purple-700">
                  {op.total}
                </p>
                <p className="text-xs text-gray-400">Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {vendor.notes && (
          <p className="text-sm text-gray-500">{vendor.notes}</p>
        )}

        {/* Embedded vendor revenue (full report at /dashboard/revenue) */}
        <VendorRevenuePanel vendorId={id} />

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200">
          <TabButton
            active={tab === 'cars'}
            onClick={() => setTab('cars')}
            icon={<Car className="h-4 w-4" />}
            label={`Cars (${cp.total})`}
          />
          <TabButton
            active={tab === 'orders'}
            onClick={() => setTab('orders')}
            icon={<ClipboardList className="h-4 w-4" />}
            label={`Orders (${op.total})`}
          />
          <TabButton
            active={tab === 'finance'}
            onClick={() => setTab('finance')}
            icon={<Wallet className="h-4 w-4" />}
            label="Tagihan & Trip"
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
            <p className="text-sm text-gray-400">Loading...</p>
          )
        )}

        {/* Cars tab */}
        {tab === 'cars' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setAddCarOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Car
              </Button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <Th className="w-10">No</Th>
                    <Th>Model</Th>
                    <Th>Plate</Th>
                    <Th className="text-right">Orders</Th>
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
                        No cars recorded for this vendor.
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
                                ? 'Has orders — cannot delete'
                                : 'Delete car'
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
              label="cars"
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
                    <Th className="w-10">No</Th>
                    <Th>Date</Th>
                    <Th>Customer</Th>
                    <Th className="hidden sm:table-cell">Car</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Price</Th>
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
                        No orders through this vendor yet.
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
                            {o.order_status}
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
                            Open
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
              label="orders"
            />
          </div>
        )}
      </div>

      {/* Add car dialog */}
      <Dialog open={addCarOpen} onOpenChange={setAddCarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Car for {vendor.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">
                Model *
              </label>
              <Input
                value={carForm.model}
                onChange={(e) =>
                  setCarForm({ ...carForm, model: e.target.value })
                }
                placeholder="e.g. Toyota Innova"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Plate</label>
              <Input
                value={carForm.plate_number}
                onChange={(e) =>
                  setCarForm({ ...carForm, plate_number: e.target.value })
                }
                placeholder="B 1234 XYZ"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Notes</label>
              <Input
                value={carForm.notes}
                onChange={(e) =>
                  setCarForm({ ...carForm, notes: e.target.value })
                }
                placeholder="Optional"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleAddCar}
              disabled={addCarMutation.isPending}
            >
              {addCarMutation.isPending ? 'Adding…' : 'Add Car'}
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
