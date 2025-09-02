/**
 * Server-side prefetching helpers - Following official TanStack Query patterns
 * These are simple helpers that match Context7 documentation examples
 */

import type { QueryClient } from '@tanstack/react-query';

import {
  getPaymentMethodsService,
  getProductsService,
  getSubscriptionsService,
} from '@/services/api';

import { queryKeys } from './query-keys';

/**
 * Prefetch subscriptions on server - official TanStack Query pattern
 * Use in server components before HydrationBoundary
 */
export async function prefetchSubscriptions(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.subscriptions.list(),
    queryFn: getSubscriptionsService,
  });
}

/**
 * Prefetch payment methods on server - official TanStack Query pattern
 * Use in server components before HydrationBoundary
 */
export async function prefetchPaymentMethods(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.paymentMethods.list(),
    queryFn: getPaymentMethodsService,
  });
}

/**
 * Prefetch products on server - official TanStack Query pattern
 * Use in server components before HydrationBoundary
 */
export async function prefetchProducts(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.products.list(),
    queryFn: getProductsService,
  });
}

/**
 * Prefetch all billing data - parallel prefetching from Context7 docs
 * Use for pages that need comprehensive billing data
 */
export async function prefetchAllBillingData(queryClient: QueryClient) {
  // Direct parallel prefetching - no complex abstractions needed
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.list(),
      queryFn: getSubscriptionsService,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.paymentMethods.list(),
      queryFn: getPaymentMethodsService,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.list(),
      queryFn: getProductsService,
    }),
  ]);
}
