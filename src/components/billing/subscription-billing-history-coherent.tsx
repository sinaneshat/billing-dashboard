'use client';

import { Receipt } from 'lucide-react';
import { memo, useMemo } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FadeIn, PageTransition } from '@/components/ui/motion';
import { useSubscriptionsQuery } from '@/hooks/queries/subscriptions';

import { PaymentHistoryCards } from './payment-history-cards';

export const SubscriptionBillingHistoryCoherent = memo(() => {
  const { data: subscriptionsData, isLoading, error } = useSubscriptionsQuery();

  // Memoize the expensive payment transformation and sorting
  const payments = useMemo(() => {
    if (!subscriptionsData?.data)
      return [];

    const subscriptions = subscriptionsData.data;

    // Transform subscription data into payment history entries (using existing API data)
    const paymentEntries = subscriptions.flatMap((sub: {
      id: string;
      status: string;
      startDate: string;
      nextBillingDate: string | null;
      currentPrice: number;
      directDebitContractId: string | null;
      product?: { name: string };
    }) => {
      const entries = [];

      // Add current subscription as a payment record if it has been paid
      if (sub.status === 'active' && sub.startDate) {
        entries.push({
          id: `${sub.id}-current`,
          productName: sub.product?.name || 'Unknown Product',
          amount: sub.currentPrice,
          status: 'completed',
          paymentMethod: sub.directDebitContractId ? 'direct-debit-contract' : 'zarinpal',
          paidAt: sub.startDate,
          createdAt: sub.startDate,
          hasReceipt: true,
        });
      }

      // Add upcoming payment if subscription is active
      if (sub.status === 'active' && sub.nextBillingDate) {
        entries.push({
          id: `${sub.id}-upcoming`,
          productName: sub.product?.name || 'Unknown Product',
          amount: sub.currentPrice,
          status: 'pending',
          paymentMethod: sub.directDebitContractId ? 'direct-debit-contract' : 'zarinpal',
          paidAt: null,
          createdAt: sub.nextBillingDate,
          hasReceipt: false,
        });
      }

      return entries;
    });

    // Sort by date (newest first)
    return paymentEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [subscriptionsData?.data]);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-6xl space-y-8">
          <FadeIn delay={0.05}>
            <div className="text-center space-y-4 py-8">
              <div className="flex items-center justify-center">
                <LoadingSpinner className="h-8 w-8 me-2" />
                <span className="text-xl">Loading payment history...</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </PageTransition>
    );
  }

  if (error || !subscriptionsData?.success) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-6xl space-y-8">
          <FadeIn delay={0.05}>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-destructive/5 to-destructive/10">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-destructive/20 to-destructive/10 rounded-2xl mx-auto mb-4">
                    <Receipt className="h-8 w-8 text-destructive" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-destructive">Failed to load payment history</h3>
                  <p className="text-muted-foreground mb-4">There was an error loading your billing history. Please try again.</p>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <>
        <FadeIn delay={0.12}>
          <PaymentHistoryCards
            payments={payments}
            isLoading={isLoading}
            className="w-full"
          />
        </FadeIn>
      </>
    </PageTransition>
  );
});
