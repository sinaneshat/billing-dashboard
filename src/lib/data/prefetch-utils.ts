'use client';

/**
 * TanStack Query Prefetching Utilities
 * Following official TanStack Query best practices from Context7 docs
 */

import { usePrefetchQuery, useQueryClient } from '@tanstack/react-query';

import {
  getPaymentMethodsService,
  getProductsService,
  getSubscriptionsService,
} from '@/services/api';

import { queryKeys } from './query-keys';

/**
 * Prefetch subscriptions data - official TanStack Query pattern
 * Use before suspense boundaries that need subscription data
 */
export function usePrefetchSubscriptions() {
  usePrefetchQuery({
    queryKey: queryKeys.subscriptions.list(),
    queryFn: getSubscriptionsService,
  });
}

/**
 * Prefetch payment methods data - official TanStack Query pattern
 * Use before suspense boundaries that need payment method data
 */
export function usePrefetchPaymentMethods() {
  usePrefetchQuery({
    queryKey: queryKeys.paymentMethods.list(),
    queryFn: getPaymentMethodsService,
  });
}

/**
 * Prefetch products data - official TanStack Query pattern
 * Use before suspense boundaries that need product data
 */
export function usePrefetchProducts() {
  usePrefetchQuery({
    queryKey: queryKeys.products.list(),
    queryFn: getProductsService,
  });
}

/**
 * Prefetch billing data on user interaction - following Context7 docs event pattern
 * Call this on hover/focus for instant loading
 */
export function useBillingPrefetch() {
  const queryClient = useQueryClient();

  return {
    prefetchOnHover: () => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.subscriptions.list(),
        queryFn: getSubscriptionsService,
      });
      queryClient.prefetchQuery({
        queryKey: queryKeys.paymentMethods.list(),
        queryFn: getPaymentMethodsService,
      });
    },

    prefetchProducts: () => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.products.list(),
        queryFn: getProductsService,
      });
    },
  };
}
