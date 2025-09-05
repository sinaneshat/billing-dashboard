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
 * Prefetch subscriptions on server - Context7 official pattern
 * Use in server components before HydrationBoundary
 */
export async function prefetchSubscriptions(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.subscriptions.list, // CRITICAL FIX: Static array like official examples
    queryFn: getSubscriptionsService,
  });
}

/**
 * Prefetch payment methods on server - Context7 official pattern
 * Use in server components before HydrationBoundary
 */
export async function prefetchPaymentMethods(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.paymentMethods.list, // CRITICAL FIX: Static array like official examples
    queryFn: getPaymentMethodsService,
  });
}

/**
 * Prefetch products on server - Context7 official pattern
 * Use in server components before HydrationBoundary
 */
export async function prefetchProducts(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.products.list, // CRITICAL FIX: Static array like official examples
    queryFn: getProductsService,
  });
}

/**
 * Prefetch all billing data - Context7 official parallel pattern
 * Use for pages that need comprehensive billing data
 */
export async function prefetchAllBillingData(queryClient: QueryClient) {
  // Direct parallel prefetching - Context7 official pattern
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.list, // CRITICAL FIX: Static array like official examples
      queryFn: getSubscriptionsService,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.paymentMethods.list, // CRITICAL FIX: Static array like official examples
      queryFn: getPaymentMethodsService,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.list, // CRITICAL FIX: Static array like official examples
      queryFn: getProductsService,
    }),
  ]);
}
