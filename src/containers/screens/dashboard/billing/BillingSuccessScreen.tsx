'use client';

import { Check, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
      router.push('/dashboard/pricing');
    }
    return undefined;
  }, [showSuccess, redirectCountdown, router]);

  // Handle error case - still redirect but show error state
  if (syncMutation.isError) {
    router.push('/dashboard/pricing?sync=failed');
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card className="w-full max-w-md border-2">
          <CardContent className="p-8">
            {!showSuccess
              ? (
                // Loading State
                  <div className="flex flex-col items-center gap-6 text-center">
                    <motion.div
                      animate={{
                        rotate: 360,
                      }}
                      transition={{
                        duration: 1,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: 'linear',
                      }}
                      className="relative"
                    >
                      <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
                      <Loader2 className="relative size-16 text-primary" />
                    </motion.div>

                    <div className="space-y-2">
                      <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-2xl font-bold tracking-tight"
                      >
                        {t('billing.success.activatingSubscription')}
                      </motion.h1>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-sm text-muted-foreground"
                      >
                        {t('billing.success.confirmingPayment')}
                      </motion.p>
                    </div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            animate={{
                              y: [0, -8, 0],
                            }}
                            transition={{
                              duration: 0.6,
                              repeat: Number.POSITIVE_INFINITY,
                              delay: i * 0.1,
                            }}
                            className="size-1.5 rounded-full bg-muted-foreground"
                          />
                        ))}
                      </div>
                      <span>Syncing with Stripe</span>
                    </motion.div>
                  </div>
                )
              : (
                // Success State
                  <div className="flex flex-col items-center gap-6 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 15,
                      }}
                      className="relative"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{
                          duration: 0.6,
                          times: [0, 0.5, 1],
                          delay: 0.2,
                        }}
                        className="absolute inset-0 rounded-full bg-green-500/20 blur-2xl"
                      />
                      <div className="relative flex size-20 items-center justify-center rounded-full bg-green-500/10">
                        <Check className="size-10 text-green-500" strokeWidth={3} />
                      </div>
                    </motion.div>

                    <div className="space-y-2">
                      <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl font-bold tracking-tight"
                      >
                        Payment Successful!
                      </motion.h1>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-sm text-muted-foreground"
                      >
                        Your subscription has been activated
                      </motion.p>
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="w-full space-y-3"
                    >
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Sparkles className="size-4" />
                        <span>
                          Redirecting in
                          {' '}
                          {redirectCountdown}
                          s
                        </span>
                      </div>

                      <Button
                        onClick={() => router.push('/dashboard/pricing')}
                        className="w-full"
                        size="lg"
                      >
                        View My Plan
                      </Button>
                    </motion.div>
                  </div>
                )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
