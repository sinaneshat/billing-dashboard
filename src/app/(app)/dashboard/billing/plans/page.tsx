import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { SubscriptionPlansScreen } from '@/containers/screens/dashboard/billing';
import { queryKeys } from '@/lib/data/query-keys';
import getQueryClient from '@/lib/query/get-query-client';
import {
  getProductsService,
  getSubscriptionsService,
} from '@/services/api';

/**
 * Subscription Plans Page - Server Component
 * Following TanStack Query official SSR patterns from Context7 docs
 * Prefetches available products and current subscriptions for instant loading
 */
export default async function PlansPage() {
  const queryClient = getQueryClient();

  // Prefetch products and current subscriptions in parallel
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.list,
      queryFn: getProductsService,
      staleTime: 10 * 60 * 1000, // 10 minutes - products don't change very often
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.list,
      queryFn: getSubscriptionsService,
      staleTime: 2 * 60 * 1000, // 2 minutes for current subscription data
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SubscriptionPlansScreen />
    </HydrationBoundary>
  );
}
