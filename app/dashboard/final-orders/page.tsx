'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

/**
 * Final Orders has been merged into the unified Orders page.
 * Orders is now the single source of truth. This route redirects to the
 * Orders view pre-filtered to orders that carry imported sheet finance data.
 */
export default function FinalOrdersRedirect() {
  const router = useRouter();
  const t = useTranslations('finalOrders');
  useEffect(() => {
    router.replace('/dashboard/orders?has_finance=true');
  }, [router]);
  return (
    <div className="flex h-full items-center justify-center p-10 text-sm text-gray-400">
      {t('redirecting')}
    </div>
  );
}
