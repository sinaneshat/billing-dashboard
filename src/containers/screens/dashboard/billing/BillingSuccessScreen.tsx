'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { useSyncAfterCheckoutMutation } from '@/hooks/mutations/checkout';

/**
 * Billing Success Screen
 *
 * This screen implements Theo's "Stay Sane with Stripe" pattern:
 * - Eagerly syncs Stripe data IMMEDIATELY when user returns from checkout
 * - Prevents race condition where UI loads before webhooks arrive
 * - Does NOT use CHECKOUT_SESSION_ID (as Theo recommends)
 * - Redirects to billing dashboard after successful sync
 *
 * Flow:
 * 1. User completes Stripe checkout
 * 2. Stripe redirects to this page
 * 3. Page auto-triggers sync mutation
 * 4. Sync fetches fresh data from Stripe API
 * 5. Page redirects to billing dashboard
 */
export default function BillingSuccessScreen() {
  const router = useRouter();
  const t = useTranslations('billing.success');
  const syncMutation = useSyncAfterCheckoutMutation();

  // Eagerly sync on page load (Theo's pattern)
  useEffect(() => {
    syncMutation.mutate(undefined);
  }, []);

  // Redirect after successful sync
  useEffect(() => {
    if (syncMutation.isSuccess) {
      router.push('/dashboard/pricing');
    }
  }, [syncMutation.isSuccess, router]);

  // Handle error case - still redirect but show error state
  if (syncMutation.isError) {
    router.push('/dashboard/pricing?sync=failed');
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p className="text-lg font-medium">{t('activatingSubscription')}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('confirmingPayment')}
        </p>
      </div>
    </div>
  );
}
