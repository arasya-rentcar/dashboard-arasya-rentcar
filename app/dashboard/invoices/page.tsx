"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  ReceiptText,
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
import { useFilePreview } from "@/components/preview/FilePreview";
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
import {
  useSendInvoiceWhatsapp,
  useSendReceiptWhatsapp,
} from "@/hooks/useOrders";
import {
  useInvoicesSearch,
  type InvoiceWithOrder,
} from "@/hooks/useInvoices";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import TablePagination from "@/components/dashboard/TablePagination";
import { formatCurrency, getErrorMessage } from "@/lib/utils";
import { openWaWindow, extractWaUrl } from "@/lib/waWindow";
import {
  InvoiceDeliveryLog,
  InvoiceStatus,
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

const INVOICE_STATUS_KEYS: Record<InvoiceStatus, string> = {
  DRAFT: "statusDraft",
  ISSUED: "statusIssued",
  REVISED: "statusRevised",
  PAID: "statusPaid",
  CANCELLED: "statusCancelled",
};

const DELIVERY_STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  SENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
};

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
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  // #6: order-level payment bucket (Belum Bayar / DP / Lunas) from
  // order.payment_status (UNPAID / DP_PAID / PAID).
  const [payFilter, setPayFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { openPreview } = useFilePreview();
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
  // Server-paginated: the API filters + paginates invoices in the DB and
  // returns each one already shaped with its order context. (Previously this
  // pulled the ENTIRE /orders list and flatMapped/filtered in the browser.)
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());

  // Reset to page 1 when any server filter changes.
  const filterKey = `${debouncedSearch}|${statusFilter}|${payFilter}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const { data, isLoading, isError, refetch } = useInvoicesSearch({
    search: debouncedSearch || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    payment_status: payFilter === "ALL" ? undefined : payFilter,
    page,
    page_size: PAGE_SIZE,
  });

  const sendMutation = useSendInvoiceWhatsapp();
  const sendReceiptMutation = useSendReceiptWhatsapp();

  const pageItems = data?.data ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? 0;
  const pageCount = pagination?.page_count ?? 1;
  const start = pagination ? (pagination.page - 1) * pagination.page_size : 0;

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
    const wa = openWaWindow();
    try {
      const result = await sendMutation.mutateAsync({
        id: inv.order.id,
        invoiceId: inv.id,
        data: {
          target_name: recipient.name || inv.order.customer_name,
          target_phone: recipient.phone,
          message_note: noteByInvoice[inv.id] || undefined,
        },
      });
      if (wa.finish(extractWaUrl(result))) toast.success(tc("waOpened"));
      else toast.success(t("okSent"));
    } catch (error) {
      wa.cancel();
      toast.error(getErrorMessage(error));
    }
  }

  async function sendReceipt(inv: InvoiceWithOrder) {
    const recipient = selectedRecipient(inv);
    if (!recipient.phone) {
      toast.error(t("errPhoneRequired"));
      return;
    }
    const wa = openWaWindow();
    try {
      const result = await sendReceiptMutation.mutateAsync({
        id: inv.order.id,
        invoiceId: inv.id,
        data: {
          target_name: recipient.name || inv.order.customer_name,
          target_phone: recipient.phone,
          message_note: noteByInvoice[inv.id] || undefined,
        },
      });
      if (wa.finish(extractWaUrl(result))) toast.success(tc("waOpened"));
      else toast.success(t("okReceiptSent"));
    } catch (error) {
      wa.cancel();
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <DashboardShell title={t('title')}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <div className="relative col-span-2 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={payFilter} onValueChange={setPayFilter}>
            <SelectTrigger className="w-full min-w-0 sm:w-44" aria-label={t('allPayments')}>
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
            <SelectTrigger className="w-full min-w-0 sm:w-40" aria-label={t('allStatus')}>
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

        <div className="bg-white rounded-xl border border-gray-200 shadow-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-8">
                  <span className="sr-only">{t('expandRow')}</span>
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide w-12 hidden xl:table-cell">
                  {t('colNo')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('colInvoiceNum')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">
                  {t('colCustomer')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                  {t('colType')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('colAmount')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                  {t('colStatus')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide text-right hidden lg:table-cell">
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
              ) : pageItems.length === 0 ? (
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
                      sending={
                        sendMutation.isPending &&
                        sendMutation.variables?.invoiceId === inv.id
                      }
                      sendingReceipt={
                        sendReceiptMutation.isPending &&
                        sendReceiptMutation.variables?.invoiceId === inv.id
                      }
                      recipients={recipientsFor(inv)}
                      onToggle={() => setExpandedId(expanded ? null : inv.id)}
                      onPreview={(url, title) =>
                        openPreview({ url, title, kind: "pdf" })
                      }
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
                      onSendReceipt={() => sendReceipt(inv)}
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
  sendingReceipt,
  recipients,
  onToggle,
  onPreview,
  onRecipientChange,
  onManualNameChange,
  onManualPhoneChange,
  onNoteChange,
  onSend,
  onSendReceipt,
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
  sendingReceipt: boolean;
  recipients: { name: string; phone?: string | null; is_primary?: boolean }[];
  onToggle: () => void;
  onPreview: (url: string, title: string) => void;
  onRecipientChange: (value: string) => void;
  onManualNameChange: (value: string) => void;
  onManualPhoneChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSend: () => void;
  onSendReceipt: () => void;
}) {
  const t = useTranslations("invoicesPage");
  const receiptUrl = inv.receipts?.[0]?.file_url || inv.receipt_url;
  const invoiceTitle = `${t('invoicePdf')} ${inv.invoice_number}`;
  const receiptTitle = `${t('receiptHeading')} ${inv.receipts?.[0]?.receipt_number ?? inv.invoice_number}`;
  return (
    <>
      <TableRow
        className="hover:bg-gray-50/50 cursor-pointer"
        onClick={onToggle}
      >
        <TableCell className="pr-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-expanded={expanded}
            aria-label={t(expanded ? 'collapseRow' : 'expandRow')}
            className="-m-1 flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </TableCell>
        <TableCell className="text-sm text-gray-400 tabular-nums hidden xl:table-cell">{no}</TableCell>
        <TableCell className="font-mono text-sm text-gray-900 font-medium">
          <div>{inv.invoice_number}</div>
          {(inv.revision ?? 0) > 0 && (
            <div className="text-xs text-amber-600 font-sans">
              {t('revision', { n: inv.revision ?? 0 })}
            </div>
          )}
          {/* Customer column is hidden on small screens: show it here. */}
          <div
            className="max-w-[11rem] truncate font-sans text-xs font-normal text-gray-500 xl:hidden"
            title={inv.order.customer_name}
          >
            {inv.order.customer_name}
          </div>
        </TableCell>
        <TableCell className="text-sm text-gray-700 hidden xl:table-cell">
          {/* Long company names would stretch the table past the screen. */}
          <div className="max-w-[12rem] truncate xl:max-w-[18rem]" title={inv.order.customer_name}>
            {inv.order.customer_name}
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <Badge
            variant="outline"
            className={`text-xs ${TYPE_STYLES[inv.invoice_type]}`}
          >
            {t(TYPE_KEYS[inv.invoice_type])}
          </Badge>
        </TableCell>
        <TableCell className="text-sm font-semibold text-gray-900 tabular-nums">
          {formatCurrency(inv.amount)}
          {/* Status and actions columns are hidden below lg: the status goes
              here, the actions live in the expanded row. */}
          <div className="mt-1 flex flex-col items-start gap-1 lg:hidden">
            <Badge
              variant="outline"
              className={`text-[10px] ${PAYMENT_STATUS_STYLES[inv.order.payment_status] ?? ""}`}
            >
              {PAYMENT_STATUS_KEYS[inv.order.payment_status]
                ? t(PAYMENT_STATUS_KEYS[inv.order.payment_status])
                : inv.order.payment_status}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] ${INVOICE_STATUS_STYLES[inv.status]}`}
            >
              {INVOICE_STATUS_KEYS[inv.status] ? t(INVOICE_STATUS_KEYS[inv.status]) : inv.status}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
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
              {INVOICE_STATUS_KEYS[inv.status] ? t(INVOICE_STATUS_KEYS[inv.status]) : inv.status}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            {inv.file_url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 xl:w-auto xl:px-2.5"
                aria-label={t('viewInvoicePdfAria', { number: inv.invoice_number })}
                title={t('viewPdf')}
                onClick={() => onPreview(inv.file_url!, invoiceTitle)}
              >
                <Eye className="h-4 w-4" />
                <span className="hidden xl:inline">PDF</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 xl:w-auto xl:px-2.5"
              asChild
            >
              <Link
                href={`/dashboard/orders/${inv.order.id}`}
                aria-label={t('openOrderAria', { number: inv.invoice_number })}
                title={t('order')}
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden xl:inline">{t('order')}</span>
              </Link>
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          {/* whitespace-normal: TableCell is nowrap by default, which kept
              every sentence in this panel on one line. */}
          <TableCell colSpan={8} className="bg-gray-50/80 p-0 whitespace-normal">
            <div className="grid gap-4 p-3 sm:p-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <FileText className="h-4 w-4" /> {t('pdfPreview')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {inv.file_url && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onPreview(inv.file_url!, invoiceTitle)}
                      >
                        <Eye className="h-4 w-4" />
                        {t('largeView')}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" asChild className="lg:hidden">
                      <Link href={`/dashboard/orders/${inv.order.id}`}>
                        <ExternalLink className="h-4 w-4" />
                        {t('order')}
                      </Link>
                    </Button>
                  </div>
                </div>
                {inv.file_url ? (
                  // Inline PDFs need room (and do not render on Android): on
                  // small screens the "Large view" button opens the viewer.
                  <iframe
                    src={pdfViewerUrl(inv.file_url)}
                    loading="lazy"
                    className="hidden h-[520px] w-full rounded-lg border bg-white md:block"
                    title={invoiceTitle}
                  />
                ) : (
                  <div className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-gray-500">
                    {t('pdfNotAvailable')}
                  </div>
                )}

                {/* Kwitansi / receipt tied to this invoice. */}
                {(inv.receipts && inv.receipts.length > 0) || inv.receipt_url ? (
                  <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                        <ReceiptText className="h-4 w-4" /> {t('receiptHeading')}
                      </div>
                      {receiptUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-emerald-300 px-2.5 text-emerald-700 hover:bg-emerald-100"
                          onClick={() => onPreview(receiptUrl, receiptTitle)}
                        >
                          <Eye className="h-3.5 w-3.5" /> {t('largeView')}
                        </Button>
                      )}
                    </div>
                    {inv.receipts && inv.receipts.length > 0 && (
                      <div className="space-y-1">
                        {inv.receipts.map((rcpt) => (
                          <div key={rcpt.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="min-w-0 truncate font-mono font-semibold text-emerald-900" title={rcpt.receipt_number}>{rcpt.receipt_number}</span>
                            <span className="shrink-0 text-emerald-700/80 tabular-nums">{formatCurrency(rcpt.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {receiptUrl && (
                      <iframe
                        src={pdfViewerUrl(receiptUrl)}
                        loading="lazy"
                        className="hidden h-[360px] w-full rounded-lg border bg-white md:block"
                        title={receiptTitle}
                      />
                    )}
                    {inv.status === "PAID" && receiptUrl && (
                      <Button
                        type="button"
                        size="sm"
                        className="h-auto min-h-8 w-full whitespace-normal bg-emerald-600 py-1.5 text-white hover:bg-emerald-700"
                        disabled={sendingReceipt}
                        onClick={onSendReceipt}
                      >
                        {sendingReceipt ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        {t("sendReceiptWhatsapp")}
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="min-w-0 space-y-4">
                <div className="rounded-lg border bg-white p-3 space-y-3 sm:p-4">
                  <div className="text-sm font-semibold text-gray-900">
                    {t('sendToWhatsapp')}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`recipient-${inv.id}`}>{t('recipient')}</Label>
                    <Select
                      value={recipientValue}
                      onValueChange={onRecipientChange}
                    >
                      <SelectTrigger id={`recipient-${inv.id}`} className="w-full min-w-0">
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
                        <Label htmlFor={`manual-name-${inv.id}`}>{t('name')}</Label>
                        <Input
                          id={`manual-name-${inv.id}`}
                          value={manualName}
                          onChange={(e) => onManualNameChange(e.target.value)}
                          placeholder={t('manualNamePlaceholder')}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`manual-phone-${inv.id}`}>{t('whatsappNumber')}</Label>
                        <Input
                          id={`manual-phone-${inv.id}`}
                          type="tel"
                          inputMode="tel"
                          value={manualPhone}
                          onChange={(e) => onManualPhoneChange(e.target.value)}
                          placeholder="0812..."
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor={`note-${inv.id}`}>{t('optionalNote')}</Label>
                    <Textarea
                      id={`note-${inv.id}`}
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
                    type="button"
                    className="h-auto min-h-9 w-full whitespace-normal py-2"
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

                <div className="rounded-lg border bg-white p-3 sm:p-4">
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
                            <div className="min-w-0 truncate font-medium text-gray-900">
                              {log.target_name || t('customerFallback')}
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${DELIVERY_STATUS_STYLES[log.status]}`}
                            >
                              {t(`deliveryStatus.${log.status}`)}
                            </Badge>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {log.target_phone} •{" "}
                            {formatDateTime(log.sent_at || log.created_at)}
                          </div>
                          {log.error_message && (
                            <div className="mt-1 text-xs text-red-600 break-words">
                              {log.error_message}
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => onPreview(log.file_url, invoiceTitle)}
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
