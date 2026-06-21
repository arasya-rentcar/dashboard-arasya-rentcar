"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import DashboardShell from "@/components/layout/DashboardShell";
import QueryError from "@/components/dashboard/QueryError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrders, useSendInvoiceWhatsapp } from "@/hooks/useOrders";
import TablePagination, { usePagination } from "@/components/dashboard/TablePagination";
import { formatCurrency, getErrorMessage } from "@/lib/utils";
import {
  Invoice,
  InvoiceDeliveryLog,
  OrderListItem,
} from "@/types";
import {
  INVOICE_STATUS_STYLES,
  INVOICE_TYPE_STYLES,
  INVOICE_TYPE_KEYS,
  PAYMENT_STATUS_STYLES,
} from "@/lib/statusStyles";

// #6: order-level payment bucket labels (Belum Bayar / DP / Lunas).
// Styles + type maps centralized in lib/statusStyles (DP_PAID standardized to amber).
const TYPE_STYLES = INVOICE_TYPE_STYLES;
const TYPE_KEYS = INVOICE_TYPE_KEYS;
const PAYMENT_STATUS_KEYS: Record<string, string> = {
  UNPAID: "payUnpaid",
  DP_PAID: "payDp",
  PAID: "payPaid",
};

const DELIVERY_STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  SENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
};

type InvoiceWithOrder = Invoice & { order: OrderListItem };

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  // #14: 24-hour time, pinned to WIB.
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function pdfViewerUrl(url?: string | null) {
  if (!url) return "";
  return `${url}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`;
}

function invoiceCanSend(inv: InvoiceWithOrder) {
  return (
    Boolean(inv.file_url) &&
    !["REVISED", "CANCELLED", "DRAFT"].includes(inv.status)
  );
}

export default function InvoicesPage() {
  const t = useTranslations("invoicesPage");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  // #6: order-level payment bucket (Belum Bayar / DP / Lunas) from
  // order.payment_status (UNPAID / DP_PAID / PAID).
  const [payFilter, setPayFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recipientByInvoice, setRecipientByInvoice] = useState<
    Record<string, string>
  >({});
  const [manualNameByInvoice, setManualNameByInvoice] = useState<
    Record<string, string>
  >({});
  const [manualPhoneByInvoice, setManualPhoneByInvoice] = useState<
    Record<string, string>
  >({});
  const [noteByInvoice, setNoteByInvoice] = useState<Record<string, string>>(
    {},
  );
  const { data: orders, isLoading, isError, refetch } = useOrders();
  const sendMutation = useSendInvoiceWhatsapp();

  const invoices = useMemo(
    () =>
      orders?.flatMap((o) =>
        o.invoices.map((inv) => ({ ...inv, order: o }) as InvoiceWithOrder),
      ) || [],
    [orders],
  );

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      search === "" ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.order.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || inv.status === statusFilter;
    const matchPay =
      payFilter === "ALL" || inv.order.payment_status === payFilter;
    return matchSearch && matchStatus && matchPay;
  });

  const PAGE_SIZE = 10;
  const { page, setPage, pageCount, total, start, pageItems } = usePagination(
    filtered,
    PAGE_SIZE,
  );

  function recipientsFor(inv: InvoiceWithOrder) {
    const raw = [
      ...(inv.order.customers || []),
      {
        name: inv.order.customer_name,
        phone: inv.order.customer_phone,
        is_primary: true,
      },
    ];
    const seen = new Set<string>();
    return raw
      .filter((c) => c.phone)
      .filter((c) => {
        const key = `${c.name || ""}|${c.phone || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function selectedRecipient(inv: InvoiceWithOrder) {
    const selection = recipientByInvoice[inv.id] || "primary";
    if (selection === "manual") {
      return {
        name: manualNameByInvoice[inv.id] || "Customer",
        phone: manualPhoneByInvoice[inv.id] || "",
      };
    }
    const recipients = recipientsFor(inv);
    const selected =
      selection === "primary" ? recipients[0] : recipients[Number(selection)];
    return (
      selected || {
        name: inv.order.customer_name,
        phone: inv.order.customer_phone,
      }
    );
  }

  async function sendInvoice(inv: InvoiceWithOrder) {
    const recipient = selectedRecipient(inv);
    if (!recipient.phone) {
      toast.error(t("errPhoneRequired"));
      return;
    }
    try {
      await sendMutation.mutateAsync({
        id: inv.order.id,
        invoiceId: inv.id,
        data: {
          target_name: recipient.name || inv.order.customer_name,
          target_phone: recipient.phone,
          message_note: noteByInvoice[inv.id] || undefined,
        },
      });
      toast.success(t("okSent"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <DashboardShell title={t('title')}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('searchPlaceholder')}
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={payFilter} onValueChange={setPayFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('allPayments')}</SelectItem>
                <SelectItem value="UNPAID">{t('payUnpaid')}</SelectItem>
                <SelectItem value="DP_PAID">{t('payDp')}</SelectItem>
                <SelectItem value="PAID">{t('payPaid')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('allStatus')}</SelectItem>
                <SelectItem value="DRAFT">{t('statusDraft')}</SelectItem>
                <SelectItem value="ISSUED">{t('statusIssued')}</SelectItem>
                <SelectItem value="REVISED">{t('statusRevised')}</SelectItem>
                <SelectItem value="PAID">{t('statusPaid')}</SelectItem>
                <SelectItem value="CANCELLED">{t('statusCancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-8" />
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide w-12">
                  {t('colNo')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('colInvoiceNum')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('colCustomer')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  {t('colType')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('colAmount')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('colStatus')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('colActions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-4">
                    <QueryError onRetry={() => refetch()} compact />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-10 text-gray-400 text-sm"
                  >
                    {t('noInvoices')}
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((inv, idx) => {
                  const expanded = expandedId === inv.id;
                  const logs = inv.delivery_logs || [];
                  const canSend = invoiceCanSend(inv);
                  return (
                    <FragmentInvoiceRow
                      key={inv.id}
                      no={start + idx + 1}
                      inv={inv}
                      expanded={expanded}
                      logs={logs}
                      canSend={canSend}
                      recipientValue={recipientByInvoice[inv.id] || "primary"}
                      manualName={manualNameByInvoice[inv.id] || ""}
                      manualPhone={manualPhoneByInvoice[inv.id] || ""}
                      note={noteByInvoice[inv.id] || ""}
                      sending={sendMutation.isPending}
                      recipients={recipientsFor(inv)}
                      onToggle={() => setExpandedId(expanded ? null : inv.id)}
                      onPreview={(url) => setPreviewUrl(url)}
                      onRecipientChange={(value) =>
                        setRecipientByInvoice((prev) => ({
                          ...prev,
                          [inv.id]: value,
                        }))
                      }
                      onManualNameChange={(value) =>
                        setManualNameByInvoice((prev) => ({
                          ...prev,
                          [inv.id]: value,
                        }))
                      }
                      onManualPhoneChange={(value) =>
                        setManualPhoneByInvoice((prev) => ({
                          ...prev,
                          [inv.id]: value,
                        }))
                      }
                      onNoteChange={(value) =>
                        setNoteByInvoice((prev) => ({
                          ...prev,
                          [inv.id]: value,
                        }))
                      }
                      onSend={() => sendInvoice(inv)}
                    />
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          page={page}
          pageCount={pageCount}
          total={total}
          start={start}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label={t('paginationLabel')}
        />
      </div>

      <Dialog
        open={!!previewUrl}
        onOpenChange={(open) => !open && setPreviewUrl(null)}
      >
        <DialogContent className="!w-[96vw] !max-w-[1400px] h-[94vh] p-4 gap-3">
          <DialogHeader>
            <DialogTitle>{t('invoicePdf')}</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe
              src={pdfViewerUrl(previewUrl)}
              className="h-full min-h-0 w-full rounded-md border"
              title="Invoice PDF Preview"
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function FragmentInvoiceRow({
  no,
  inv,
  expanded,
  logs,
  canSend,
  recipientValue,
  manualName,
  manualPhone,
  note,
  sending,
  recipients,
  onToggle,
  onPreview,
  onRecipientChange,
  onManualNameChange,
  onManualPhoneChange,
  onNoteChange,
  onSend,
}: {
  no: number;
  inv: InvoiceWithOrder;
  expanded: boolean;
  logs: InvoiceDeliveryLog[];
  canSend: boolean;
  recipientValue: string;
  manualName: string;
  manualPhone: string;
  note: string;
  sending: boolean;
  recipients: { name: string; phone?: string | null; is_primary?: boolean }[];
  onToggle: () => void;
  onPreview: (url: string) => void;
  onRecipientChange: (value: string) => void;
  onManualNameChange: (value: string) => void;
  onManualPhoneChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSend: () => void;
}) {
  const t = useTranslations("invoicesPage");
  return (
    <>
      <TableRow
        className="hover:bg-gray-50/50 cursor-pointer"
        onClick={onToggle}
      >
        <TableCell>
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </TableCell>
        <TableCell className="text-sm text-gray-400 tabular-nums">{no}</TableCell>
        <TableCell className="font-mono text-sm text-gray-900 font-medium">
          <div>{inv.invoice_number}</div>
          {(inv.revision ?? 0) > 0 && (
            <div className="text-xs text-amber-600 font-sans">
              {t('revision', { n: inv.revision ?? 0 })}
            </div>
          )}
        </TableCell>
        <TableCell className="text-sm text-gray-700">
          {inv.order.customer_name}
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <Badge
            variant="outline"
            className={`text-xs ${TYPE_STYLES[inv.invoice_type]}`}
          >
            {t(TYPE_KEYS[inv.invoice_type])}
          </Badge>
        </TableCell>
        <TableCell className="text-sm font-semibold text-gray-900">
          {formatCurrency(inv.amount)}
        </TableCell>
        <TableCell>
          <div className="flex flex-col items-start gap-1">
            {/* Order-level payment bucket (the business view). */}
            <Badge
              variant="outline"
              className={`text-xs ${PAYMENT_STATUS_STYLES[inv.order.payment_status] ?? ""}`}
            >
              {PAYMENT_STATUS_KEYS[inv.order.payment_status]
                ? t(PAYMENT_STATUS_KEYS[inv.order.payment_status])
                : inv.order.payment_status}
            </Badge>
            {/* Per-invoice status kept visible so admin sees which doc is settled. */}
            <Badge
              variant="outline"
              className={`text-[10px] ${INVOICE_STATUS_STYLES[inv.status]}`}
            >
              {inv.status}
            </Badge>
          </div>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            {inv.file_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPreview(inv.file_url!)}
              >
                <Eye className="h-4 w-4 mr-1" />
                PDF
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/orders/${inv.order.id}`}>
                <ExternalLink className="h-4 w-4 mr-1" />
                {t('order')}
              </Link>
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={8} className="bg-gray-50/80 p-0">
            <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <FileText className="h-4 w-4" /> {t('pdfPreview')}
                  </div>
                  {inv.file_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPreview(inv.file_url!)}
                    >
                      {t('largeView')}
                    </Button>
                  )}
                </div>
                {inv.file_url ? (
                  <iframe
                    src={pdfViewerUrl(inv.file_url)}
                    className="h-[520px] w-full rounded-lg border bg-white"
                    title={`${inv.invoice_number} PDF`}
                  />
                ) : (
                  <div className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-gray-500">
                    {t('pdfNotAvailable')}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border bg-white p-4 space-y-3">
                  <div className="text-sm font-semibold text-gray-900">
                    {t('sendToWhatsapp')}
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('recipient')}</Label>
                    <Select
                      value={recipientValue}
                      onValueChange={onRecipientChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('chooseRecipient')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">
                          {t('primaryCustomer')}
                        </SelectItem>
                        {recipients.map((recipient, index) => (
                          <SelectItem
                            key={`${recipient.name}-${recipient.phone}-${index}`}
                            value={String(index)}
                          >
                            {recipient.name || t('customerFallback')} — {recipient.phone}
                          </SelectItem>
                        ))}
                        <SelectItem value="manual">{t('manualNumber')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {recipientValue === "manual" && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>{t('name')}</Label>
                        <Input
                          value={manualName}
                          onChange={(e) => onManualNameChange(e.target.value)}
                          placeholder="Finance / PIC"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t('whatsappNumber')}</Label>
                        <Input
                          value={manualPhone}
                          onChange={(e) => onManualPhoneChange(e.target.value)}
                          placeholder="0812..."
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>{t('optionalNote')}</Label>
                    <Textarea
                      value={note}
                      onChange={(e) => onNoteChange(e.target.value)}
                      placeholder={t('notePlaceholder')}
                      rows={3}
                    />
                  </div>
                  {!canSend && (
                    <p className="text-xs text-amber-700">
                      {t('sendWarning')}
                    </p>
                  )}
                  <Button
                    className="w-full"
                    disabled={!canSend || sending}
                    onClick={onSend}
                  >
                    {sending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {t('sendPdfWhatsapp')}
                  </Button>
                </div>

                <div className="rounded-lg border bg-white p-4">
                  <div className="mb-3 text-sm font-semibold text-gray-900">
                    {t('sendHistory')}
                  </div>
                  {logs.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      {t('noSends')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className="rounded-md border p-3 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-gray-900">
                              {log.target_name || t('customerFallback')}
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${DELIVERY_STATUS_STYLES[log.status]}`}
                            >
                              {log.status}
                            </Badge>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {log.target_phone} •{" "}
                            {formatDateTime(log.sent_at || log.created_at)}
                          </div>
                          {log.error_message && (
                            <div className="mt-1 text-xs text-red-600">
                              {log.error_message}
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => onPreview(log.file_url)}
                          >
                            <Eye className="h-4 w-4 mr-1" /> {t('viewPdf')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
