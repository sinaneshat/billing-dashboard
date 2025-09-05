import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { SubscriptionManagementScreen } from '@/containers/screens/dashboard/billing';
import { getQueryClient } from '@/lib/data/query-client';
import { queryKeys } from '@/lib/data/query-keys';
import {
  getPaymentMethodsService,
  getSubscriptionsService,
} from '@/services/api';

/**
 * Subscription Management Page - Server Component
 * Following TanStack Query official SSR patterns from Context7 docs
 * Prefetches subscription data and payment methods for instant loading
 */
export default async function SubscriptionsPage() {
  const queryClient = getQueryClient();

  // Prefetch subscriptions and related payment method data in parallel
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.list,
      queryFn: getSubscriptionsService,
      staleTime: 2 * 60 * 1000, // 2 minutes for subscription data
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.paymentMethods.list,
      queryFn: getPaymentMethodsService,
      staleTime: 5 * 60 * 1000, // 5 minutes - needed for subscription payment updates
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SubscriptionManagementScreen />
    </HydrationBoundary>
  );
}
