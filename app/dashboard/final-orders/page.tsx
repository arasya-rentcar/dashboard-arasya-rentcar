'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Final Orders has been merged into the unified Orders page.
 * Orders is now the single source of truth. This route redirects to the
 * Orders view pre-filtered to orders that carry imported sheet finance data.
 */
export default function FinalOrdersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/orders?has_finance=true');
  }, [router]);
  return (
    <div className="flex h-full items-center justify-center p-10 text-sm text-gray-400">
      Final Orders moved into Orders — redirecting…
    </div>
  );
}
