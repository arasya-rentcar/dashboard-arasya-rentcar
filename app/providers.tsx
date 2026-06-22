'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Treat data as fresh for 60s so revisiting a page / remounting a
            // query within the window serves cache instead of refetching.
            staleTime: 60 * 1000,
            // Don't refetch every mounted query just because the tab regained
            // focus — that was the silent "so many API calls" multiplier.
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </LocaleProvider>
    </QueryClientProvider>
  );
}
