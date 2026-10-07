'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BadgeCheck,
  Eye,
  FileText,
  Loader2,
  ShieldAlert,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFilePreview } from '@/components/preview/FilePreview';
import { customersApi } from '@/lib/api';
import {
  useDeleteCustomerDocument,
  useUpdateCustomer,
  useUploadCustomerDocument,
  useVerifyCustomer,
} from '@/hooks/useCustomers';
import { formatDateTime, getErrorMessage } from '@/lib/utils';
import type { CustomerDetail, CustomerDocument, CustomerDocumentKind } from '@/types';

const KINDS: CustomerDocumentKind[] = ['KTP', 'SIM', 'NPWP', 'PASPOR', 'LAINNYA'];
const MAX_BYTES = 10 * 1024 * 1024;
const NIK_RE = /^\d{16}$/;

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function CustomerIdentityCard({
  customer,
}: {
  customer: CustomerDetail;
}) {
  const t = useTranslations('customerIdentity');
  const updateMutation = useUpdateCustomer();
  const verifyMutation = useVerifyCustomer();
  const uploadMutation = useUploadCustomerDocument();
  const deleteMutation = useDeleteCustomerDocument();
  const { openPreview } = useFilePreview();

  const [nik, setNik] = useState('');
  const [address, setAddress] = useState('');
  const [company, setCompany] = useState('');
  const [touched, setTouched] = useState(false);

  const [kind, setKind] = useState<CustomerDocumentKind>('KTP');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [toDelete, setToDelete] = useState<CustomerDocument | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    setNik(customer.id_number ?? '');
    setAddress(customer.address ?? '');
    setCompany(customer.company_name ?? '');
    setTouched(false);
  }, [customer.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const nikInvalid = nik !== '' && !NIK_RE.test(nik);
  const dirty =
    nik !== (customer.id_number ?? '') ||
    address !== (customer.address ?? '') ||
    company !== (customer.company_name ?? '');
  const documents = customer.documents ?? [];
  const verified = Boolean(customer.verified);

  async function saveIdentity() {
    setTouched(true);
    if (nikInvalid) return;
    try {
      await updateMutation.mutateAsync({
        id: customer.id,
        data: {
          id_number: nik.trim() || null,
          address: address.trim() || null,
          company_name: company.trim() || null,
        },
      });
      toast.success(t('okSaved'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function toggleVerified() {
    try {
      await verifyMutation.mutateAsync({ id: customer.id, verified: !verified });
      toast.success(verified ? t('okUnverified') : t('okVerified'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function pickFile(f: File | null) {
    setFileError(null);
    if (f && f.size > MAX_BYTES) {
      setFileError(t('errFileSize'));
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (f && !(f.type.startsWith('image/') || f.type === 'application/pdf')) {
      setFileError(t('errFileType'));
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setFile(f);
  }

  async function upload() {
    if (!file) {
      setFileError(t('errFileRequired'));
      return;
    }
    try {
      await uploadMutation.mutateAsync({
        id: customer.id,
        data: { file, kind, note: note.trim() || undefined },
      });
      toast.success(t('okUploaded'));
      setFile(null);
      setNote('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  // The signed URL is short-lived: fetch a fresh one on every click and never
  // keep it. It lives only in the in-page viewer, which drops it on close.
  async function view(doc: CustomerDocument) {
    if (openingId) return;
    setOpeningId(doc.id);
    try {
      const res = await customersApi.documentUrl(customer.id, doc.id);
      const url: string | undefined = res.data?.data?.url ?? res.data?.url;
      if (!url) throw new Error(t('errNoUrl'));
      openPreview({
        url,
        title: t(`kind.${doc.kind}`),
        // The signed URL path may not end in an extension: use the stored type.
        kind: doc.mime === 'application/pdf' ? 'pdf' : doc.mime?.startsWith('image/') ? 'image' : 'auto',
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setOpeningId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: customer.id, docId: toDelete.id });
      toast.success(t('okDeleted'));
      setToDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <Card className="border border-gray-200 shadow-none">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            {t('title')}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {verified ? (
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200"
              >
                <BadgeCheck className="h-3 w-3 mr-1" /> {t('verified')}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-200"
              >
                <ShieldAlert className="h-3 w-3 mr-1" /> {t('notVerified')}
              </Badge>
            )}
            <Button
              type="button"
              size="sm"
              variant={verified ? 'outline' : 'default'}
              onClick={toggleVerified}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              )}
              {verified ? t('unmarkVerified') : t('markVerified')}
            </Button>
          </div>
        </div>
        {verified && customer.id_verified_at && (
          <p className="text-xs text-gray-500">
            {t('verifiedBy', {
              by: customer.id_verified_by || '-',
              at: formatDateTime(customer.id_verified_at),
            })}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        {/* NIK / alamat / perusahaan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cust-nik" className="text-xs text-gray-500">
              {t('nik')}
            </Label>
            <Input
              id="cust-nik"
              inputMode="numeric"
              maxLength={16}
              placeholder={t('nikPlaceholder')}
              value={nik}
              onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
              className={nikInvalid && touched ? 'border-red-400' : ''}
            />
            {nikInvalid && (
              <p className="text-xs text-red-500">
                {t('errNik', { count: nik.length })}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cust-company" className="text-xs text-gray-500">
              {t('company')}
            </Label>
            <Input
              id="cust-company"
              placeholder={t('companyPlaceholder')}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="cust-address" className="text-xs text-gray-500">
              {t('address')}
            </Label>
            <Input
              id="cust-address"
              placeholder={t('addressPlaceholder')}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={saveIdentity}
            disabled={!dirty || nikInvalid || updateMutation.isPending}
          >
            {updateMutation.isPending ? t('saving') : t('saveIdentity')}
          </Button>
        </div>

        {/* Documents */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs font-medium text-gray-500">
            {t('documents', { count: documents.length })}
          </p>
          {documents.length === 0 ? (
            <p className="text-xs text-gray-400">{t('noDocuments')}</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
              {documents.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                >
                  <div className="flex min-w-0 flex-1 basis-56 items-center gap-2.5">
                    <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{t(`kind.${d.kind}`)}</span>
                        <span className="text-xs text-gray-400">
                          {' '}
                          · {formatSize(d.size)}
                        </span>
                      </p>
                      <p
                        className="text-xs text-gray-500 truncate"
                        title={`${t('uploadedAt', {
                          at: formatDateTime(d.created_at),
                          by: d.uploaded_by || '-',
                        })}${d.note ? ` · ${d.note}` : ''}`}
                      >
                        {t('uploadedAt', {
                          at: formatDateTime(d.created_at),
                          by: d.uploaded_by || '-',
                        })}
                        {d.note ? ` · ${d.note}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => view(d)}
                      disabled={openingId !== null}
                    >
                      {openingId === d.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {t('view')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => setToDelete(d)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> {t('delete')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Upload */}
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)] gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="cust-doc-kind" className="text-xs text-gray-500">{t('docKind')}</Label>
                <Select
                  value={kind}
                  onValueChange={(v) => setKind(v as CustomerDocumentKind)}
                >
                  <SelectTrigger id="cust-doc-kind" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`kind.${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-doc-note" className="text-xs text-gray-500">{t('docNote')}</Label>
                <Input
                  id="cust-doc-note"
                  placeholder={t('docNotePlaceholder')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                aria-label={t('docFile')}
                className="h-auto min-w-0 flex-1 basis-56 sm:max-w-sm text-xs"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                size="sm"
                onClick={upload}
                disabled={!file || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {t('upload')}
              </Button>
            </div>
            {fileError && <p className="text-xs text-red-500">{fileError}</p>}
            <p className="text-[11px] text-gray-400">{t('fileHint')}</p>
          </div>

          <p className="text-xs text-gray-500 flex items-start gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
            {t('privacyNote')}
          </p>
        </div>
      </CardContent>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {t('deleteConfirm', {
              kind: toDelete ? t(`kind.${toDelete.kind}`) : '',
            })}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setToDelete(null)}
              disabled={deleteMutation.isPending}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t('deleting') : t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
