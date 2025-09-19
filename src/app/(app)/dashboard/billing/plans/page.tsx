import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { SubscriptionPlansScreen } from '@/containers/screens/dashboard/billing';
import { getQueryClient } from '@/lib/data/query-client';
import { queryKeys } from '@/lib/data/query-keys';
import {
  getPaymentMethodsService,
  getProductsService,
  getSubscriptionsService,
} from '@/services/api';

// ISR Configuration - Revalidate plans every 2 hours since they change infrequently
export const revalidate = 7200; // 2 hours in seconds

/**
 * Subscription Plans Page - Server Component
 * Following TanStack Query official SSR patterns from Context7 docs
 *
 * Features:
 * - Server-side prefetching for instant loading
 * - ISR with 2-hour revalidation for product plans
 * - Prefetch related billing data for seamless navigation
 * - Follows established billing page patterns
 */
export default async function PlansPage() {
  const queryClient = getQueryClient();

  // Prefetch products and related billing data in parallel
  // Products use longer stale time to match ISR revalidation
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.list,
      queryFn: getProductsService,
      staleTime: 2 * 60 * 60 * 1000, // 2 hours to match ISR revalidation
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.list,
      queryFn: getSubscriptionsService,
      staleTime: 2 * 60 * 1000, // 2 minutes for subscription data
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.paymentMethods.list,
      queryFn: getPaymentMethodsService,
      staleTime: 5 * 60 * 1000, // 5 minutes - needed for plan upgrades
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SubscriptionPlansScreen />
    </HydrationBoundary>
  );
}
