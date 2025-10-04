'use client';

import { CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ScaleIn, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { useSyncAfterCheckoutMutation } from '@/hooks/mutations/checkout';

/**
 * Billing Success Screen
 *
 * This screen implements Theo's "Stay Sane with Stripe" pattern:
 * - Eagerly syncs Stripe data IMMEDIATELY when user returns from checkout
 * - Prevents race condition where UI loads before webhooks arrive
 * - Does NOT use CHECKOUT_SESSION_ID (as Theo recommends)
 * - Redirects to pricing page after successful sync
 *
 * Flow:
 * 1. User completes Stripe checkout
 * 2. Stripe redirects to this page
 * 3. Page auto-triggers sync mutation
 * 4. Sync fetches fresh data from Stripe API
 * 5. Page shows success animation
 * 6. Page redirects to pricing page
 */
export default function BillingSuccessScreen() {
  const router = useRouter();
  const t = useTranslations();
  const syncMutation = useSyncAfterCheckoutMutation();
  const [showSuccess, setShowSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // Eagerly sync on page load (Theo's pattern)
  useEffect(() => {
    syncMutation.mutate(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally run once on mount
  }, []);

  // Show success state after sync completes
  useEffect(() => {
    if (syncMutation.isSuccess) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect -- State update based on async operation
      setShowSuccess(true);
    }
  }, [syncMutation.isSuccess]);

  // Countdown and redirect
  useEffect(() => {
    if (showSuccess && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (showSuccess && redirectCountdown === 0) {
      router.push('/chat/pricing');
    }
    return undefined;
  }, [showSuccess, redirectCountdown, router]);

  // Handle error case - still redirect but show error state
  if (syncMutation.isError) {
    router.push('/chat/pricing?sync=failed');
    return null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-start px-4 pt-16 md:pt-20">
      {!showSuccess
        ? (
          // Loading State
            <StaggerContainer
              className="flex flex-col items-center gap-5 text-center"
              staggerDelay={0.1}
              delayChildren={0.1}
            >
              <StaggerItem>
                <LoadingSpinner size="lg" />
              </StaggerItem>

              <StaggerItem className="space-y-2">
                <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                  {t('billing.success.activatingSubscription')}
                </h1>
                <p className="text-sm text-muted-foreground md:text-base">
                  {t('billing.success.confirmingPayment')}
                </p>
              </StaggerItem>
            </StaggerContainer>
          )
        : (
          // Success State
            <StaggerContainer
              className="flex flex-col items-center gap-6 text-center"
              staggerDelay={0.15}
              delayChildren={0.1}
            >
              <StaggerItem>
                <ScaleIn duration={0.3} delay={0}>
                  <div className="flex size-20 items-center justify-center rounded-full bg-green-500/10 ring-4 ring-green-500/20 md:size-24">
                    <CheckCircle className="size-10 text-green-500 md:size-12" strokeWidth={2} />
                  </div>
                </ScaleIn>
              </StaggerItem>

              <StaggerItem className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                  {t('billing.success.title')}
                </h1>
                <p className="text-sm text-muted-foreground md:text-base">
                  {t('billing.success.description')}
                </p>
              </StaggerItem>

              <StaggerItem className="flex flex-col items-center gap-4">
                <p className="text-xs text-muted-foreground md:text-sm">
                  {t('billing.success.redirecting', { count: redirectCountdown })}
                </p>

                <Button
                  onClick={() => router.push('/chat/pricing')}
                  size="lg"
                  className="min-w-[200px]"
                >
                  {t('billing.success.viewPlan')}
                </Button>
              </StaggerItem>
            </StaggerContainer>
          )}
    </div>
  );
}
