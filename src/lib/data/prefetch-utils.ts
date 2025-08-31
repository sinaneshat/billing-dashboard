/**
 * TanStack Query Prefetching Utilities
 *
 * This module provides utilities for implementing prefetching best practices
 * according to TanStack Query recommendations.
 */

import type { QueryClient } from '@tanstack/react-query';

import {
  checkHealthService,
  getCurrentUserService,
  getPaymentsService,
  getProductsService,
  getSubscriptionsService,
  getUserAvatarsService,
} from '@/services/api';

import { queryKeys } from './query-keys';

/**
 * Prefetch critical user data on authenticated pages
 * This follows TanStack Query best practices for essential data that users need immediately
 */
export async function prefetchEssentialUserData(queryClient: QueryClient) {
  const prefetchPromises = [
    // Current user - most critical
    queryClient.prefetchQuery({
      queryKey: queryKeys.auth.current,
      queryFn: getCurrentUserService,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),

    // Current subscription - critical for billing dashboard
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.current(),
      queryFn: () => getSubscriptionsService({ query: { status: 'active', limit: '1' } }),
      staleTime: 2 * 60 * 1000, // 2 minutes
    }),

    // Current user avatar - for UI
    queryClient.prefetchQuery({
      queryKey: queryKeys.images.currentAvatar(),
      queryFn: () => getUserAvatarsService(),
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),
  ];

  await Promise.allSettled(prefetchPromises);
}

/**
 * Prefetch dashboard-specific data
 * This prefetches data that's likely to be needed on dashboard pages
 */
export async function prefetchDashboardData(queryClient: QueryClient) {
  const prefetchPromises = [
    // Recent payment history - likely needed on dashboard
    queryClient.prefetchQuery({
      queryKey: queryKeys.payments.history({ limit: '5' }),
      queryFn: () => getPaymentsService({ query: { limit: '5', sort: 'createdAt:desc' } }),
      staleTime: 1 * 60 * 1000, // 1 minute - financial data changes frequently
    }),

    // All subscriptions - for subscription management
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.list(),
      queryFn: () => getSubscriptionsService(),
      staleTime: 2 * 60 * 1000, // 2 minutes
    }),
  ];

  await Promise.allSettled(prefetchPromises);
}

/**
 * Prefetch billing-specific data
 * For billing and subscription management pages
 */
export async function prefetchBillingData(queryClient: QueryClient) {
  const prefetchPromises = [
    // Available products - for subscription changes
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.list(),
      queryFn: () => getProductsService(),
      staleTime: 10 * 60 * 1000, // 10 minutes - products are stable
    }),

    // Payment history - for billing dashboard
    queryClient.prefetchQuery({
      queryKey: queryKeys.payments.history(),
      queryFn: () => getPaymentsService(),
      staleTime: 1 * 60 * 1000, // 1 minute
    }),

    // All subscriptions with details
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.list(),
      queryFn: () => getSubscriptionsService(),
      staleTime: 2 * 60 * 1000, // 2 minutes
    }),
  ];

  await Promise.allSettled(prefetchPromises);
}

/**
 * Prefetch system status data
 * For admin or system monitoring pages
 */
export async function prefetchSystemData(queryClient: QueryClient) {
  const prefetchPromises = [
    // Health status
    queryClient.prefetchQuery({
      queryKey: queryKeys.health.status,
      queryFn: () => checkHealthService(),
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),
  ];

  await Promise.allSettled(prefetchPromises);
}

/**
 * Strategy-based prefetching for different page types
 * This implements TanStack Query recommended patterns for different use cases
 */
export const prefetchStrategies = {
  /**
   * Essential data that should be prefetched on all authenticated pages
   * Uses aggressive prefetching for immediate UX
   */
  essential: prefetchEssentialUserData,

  /**
   * Dashboard-specific prefetching
   * Balances performance with data freshness
   */
  dashboard: async (queryClient: QueryClient) => {
    await Promise.all([
      prefetchEssentialUserData(queryClient),
      prefetchDashboardData(queryClient),
    ]);
  },

  /**
   * Billing page prefetching
   * Comprehensive prefetching for billing workflows
   */
  billing: async (queryClient: QueryClient) => {
    await Promise.all([
      prefetchEssentialUserData(queryClient),
      prefetchBillingData(queryClient),
    ]);
  },

  /**
   * System/admin page prefetching
   */
  system: async (queryClient: QueryClient) => {
    await Promise.all([
      prefetchEssentialUserData(queryClient),
      prefetchSystemData(queryClient),
    ]);
  },
} as const;

/**
 * Utility to prefetch on hover/focus for improved perceived performance
 * This follows TanStack Query's "prefetch on interaction" pattern
 */
export function createPrefetchOnInteraction(
  queryClient: QueryClient,
  strategy: keyof typeof prefetchStrategies,
) {
  let prefetchPromise: Promise<void> | null = null;

  return {
    onMouseEnter: () => {
      if (!prefetchPromise) {
        prefetchPromise = prefetchStrategies[strategy](queryClient);
      }
    },
    onFocus: () => {
      if (!prefetchPromise) {
        prefetchPromise = prefetchStrategies[strategy](queryClient);
      }
    },
  };
}
