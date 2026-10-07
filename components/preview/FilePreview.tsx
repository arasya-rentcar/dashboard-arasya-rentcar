'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileWarning,
  Loader2,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PreviewKind = 'image' | 'pdf' | 'auto';

export interface PreviewItem {
  url: string;
  title?: string;
  /** 'auto' (default) decides from the file extension in the URL path. */
  kind?: PreviewKind;
}

interface FilePreviewContextValue {
  /** Open one file, or a gallery starting at `startIndex`. */
  openPreview: (items: PreviewItem | PreviewItem[], startIndex?: number) => void;
}

const FilePreviewContext = createContext<FilePreviewContextValue | null>(null);

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i;

function resolveKind(item: PreviewItem): 'image' | 'pdf' | 'other' {
  if (item.kind && item.kind !== 'auto') return item.kind;
  let path = item.url;
  try {
    path = new URL(item.url, 'http://x').pathname;
  } catch {
    /* keep raw url */
  }
  if (/\.pdf$/i.test(path)) return 'pdf';
  if (IMAGE_EXT.test(path)) return 'image';
  return 'other';
}

/** Android Chrome cannot render a PDF inside an iframe; it shows a blank box. */
function cannotEmbedPdf() {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

/**
 * Shows invoices, receipts and driver photos in a large in-page viewer instead
 * of a new tab. Mounted once in the dashboard layout; call `useFilePreview()`.
 */
export function FilePreviewProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [index, setIndex] = useState(0);

  const openPreview = useCallback((next: PreviewItem | PreviewItem[], startIndex = 0) => {
    const list = (Array.isArray(next) ? next : [next]).filter((i) => i.url);
    if (list.length === 0) return;
    setItems(list);
    setIndex(Math.min(Math.max(startIndex, 0), list.length - 1));
  }, []);

  const value = useMemo(() => ({ openPreview }), [openPreview]);

  return (
    <FilePreviewContext.Provider value={value}>
      {children}
      <FilePreviewDialog
        items={items}
        index={index}
        onIndexChange={setIndex}
        onClose={() => setItems([])}
      />
    </FilePreviewContext.Provider>
  );
}

export function useFilePreview(): FilePreviewContextValue {
  const ctx = useContext(FilePreviewContext);
  if (!ctx) throw new Error('useFilePreview must be used within <FilePreviewProvider>');
  return ctx;
}

function FilePreviewDialog({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: PreviewItem[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations('filePreview');
  const open = items.length > 0;
  const item = items[index];
  const kind = item ? resolveKind(item) : 'other';
  const many = items.length > 1;

  const [zoomed, setZoomed] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Reset the view whenever a different file is shown.
  useEffect(() => {
    setZoomed(false);
    setRotation(0);
    setStatus('loading');
  }, [item?.url]);

  const go = useCallback(
    (delta: number) => {
      if (!many) return;
      onIndexChange((index + delta + items.length) % items.length);
    },
    [index, items.length, many, onIndexChange],
  );

  useEffect(() => {
    if (!open || !many) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, many, go]);

  const title = item?.title || (kind === 'pdf' ? t('document') : t('photo'));
  const sideways = rotation % 180 !== 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="!w-[100vw] !max-w-none h-[100dvh] max-h-none rounded-none p-0 gap-0 overflow-hidden flex flex-col sm:!w-[calc(100vw-2rem)] sm:h-[calc(100dvh-2rem)] sm:rounded-lg xl:!max-w-[1600px]"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 bg-white py-2 pl-3 pr-12 sm:pl-4">
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-sm font-semibold sm:text-base" title={title}>
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {many ? t('counter', { current: index + 1, total: items.length }) : t(kind === 'pdf' ? 'pdfHint' : 'imageHint')}
            </DialogDescription>
          </div>
          {kind === 'image' && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setZoomed((z) => !z)}
                aria-label={zoomed ? t('zoomOut') : t('zoomIn')}
                title={zoomed ? t('zoomOut') : t('zoomIn')}
              >
                {zoomed ? <ZoomOut /> : <ZoomIn />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                aria-label={t('rotate')}
                title={t('rotate')}
              >
                <RotateCw />
              </Button>
            </>
          )}
          {item && (
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <a href={item.url} target="_blank" rel="noopener noreferrer" title={t('openNewTab')}>
                <ExternalLink />
                <span className="hidden sm:inline">{t('openNewTab')}</span>
              </a>
            </Button>
          )}
        </div>

        <div className="relative flex-1 min-h-0 bg-gray-900/95">
          {item && kind === 'image' && (
            <div
              className={cn(
                'h-full w-full',
                zoomed ? 'overflow-auto' : 'flex items-center justify-center overflow-hidden p-2 sm:p-4',
              )}
            >
              {status === 'loading' && (
                <Loader2 className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-spin text-white/70" />
              )}
              {status === 'error' ? (
                <PreviewError url={item.url} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={item.url}
                  src={item.url}
                  alt={title}
                  onLoad={() => setStatus('ready')}
                  onError={() => setStatus('error')}
                  onClick={() => setZoomed((z) => !z)}
                  style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
                  className={cn(
                    'select-none transition-transform',
                    zoomed
                      ? 'max-w-none cursor-zoom-out'
                      : cn(
                          'object-contain cursor-zoom-in',
                          sideways ? 'max-h-[min(calc(100vw-4rem),1550px)] max-w-[calc(100dvh-8rem)]' : 'max-h-full max-w-full',
                        ),
                    status !== 'ready' && 'opacity-0',
                  )}
                />
              )}
            </div>
          )}

          {item && kind === 'pdf' && (
            cannotEmbedPdf() ? (
              <PreviewError url={item.url} message={t('pdfNotSupported')} />
            ) : (
              <iframe
                key={item.url}
                src={`${item.url}#toolbar=1&navpanes=0&view=FitH`}
                title={title}
                className="h-full w-full border-0 bg-white"
              />
            )
          )}

          {item && kind === 'other' && (
            <iframe key={item.url} src={item.url} title={title} className="h-full w-full border-0 bg-white" />
          )}

          {many && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={t('previous')}
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={t('next')}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewError({ url, message }: { url: string; message?: string }) {
  const t = useTranslations('filePreview');
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white/80">
      <FileWarning className="h-10 w-10" />
      <p className="max-w-sm text-sm">{message ?? t('loadFailed')}</p>
      <Button variant="secondary" size="sm" asChild>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink /> {t('openNewTab')}
        </a>
      </Button>
    </div>
  );
}
