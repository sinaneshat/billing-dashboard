import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { SubscriptionBillingScreen } from '@/containers/screens/dashboard/billing';
import { queryKeys } from '@/lib/data/query-keys';
import getQueryClient from '@/lib/query/get-query-client';
import {
  getPaymentMethodsService,
  getPaymentsService,
  getSubscriptionsService,
} from '@/services/api';

/**
 * Payment History Page - Server Component
 * Following TanStack Query official SSR patterns from Context7 docs
 * Prefetches payment history and related billing data for instant loading
 */
export default async function SubscriptionBillingPage() {
  const queryClient = getQueryClient();

  // Prefetch payment history with related billing data in parallel
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.payments.list,
      queryFn: getPaymentsService,
      staleTime: 60 * 1000, // 1 minute for payment history - can change frequently
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.list,
      queryFn: getSubscriptionsService,
      staleTime: 2 * 60 * 1000, // 2 minutes for subscription data
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.paymentMethods.list,
      queryFn: getPaymentMethodsService,
      staleTime: 5 * 60 * 1000, // 5 minutes for payment methods
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SubscriptionBillingScreen />
    </HydrationBoundary>
  );
}
