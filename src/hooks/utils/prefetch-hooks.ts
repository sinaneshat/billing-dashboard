/**
 * Prefetching Hooks for Components
 *
 * Component-level hooks that provide easy access to prefetching strategies
 * following TanStack Query best practices.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { createPrefetchOnInteraction, prefetchStrategies } from '@/lib/data/prefetch-utils';

/**
 * Hook to prefetch dashboard data on component mount or interaction
 */
export function useDashboardPrefetch() {
  const queryClient = useQueryClient();

  const prefetchDashboard = useCallback(async () => {
    try {
      await prefetchStrategies.dashboard(queryClient);
    } catch (error) {
      console.warn('Dashboard prefetch failed:', error);
    }
  }, [queryClient]);

  const prefetchOnInteraction = createPrefetchOnInteraction(queryClient, 'dashboard');

  return {
    prefetchDashboard,
    prefetchOnHover: prefetchOnInteraction.onMouseEnter,
    prefetchOnFocus: prefetchOnInteraction.onFocus,
  };
}

/**
 * Hook to prefetch billing-specific data
 */
export function useBillingPrefetch() {
  const queryClient = useQueryClient();

  const prefetchBilling = useCallback(async () => {
    try {
      await prefetchStrategies.billing(queryClient);
    } catch (error) {
      console.warn('Billing prefetch failed:', error);
    }
  }, [queryClient]);

  const prefetchOnInteraction = createPrefetchOnInteraction(queryClient, 'billing');

  return {
    prefetchBilling,
    prefetchOnHover: prefetchOnInteraction.onMouseEnter,
    prefetchOnFocus: prefetchOnInteraction.onFocus,
  };
}

/**
 * Hook to prefetch system monitoring data
 */
export function useSystemPrefetch() {
  const queryClient = useQueryClient();

  const prefetchSystem = useCallback(async () => {
    try {
      await prefetchStrategies.system(queryClient);
    } catch (error) {
      console.warn('System prefetch failed:', error);
    }
  }, [queryClient]);

  const prefetchOnInteraction = createPrefetchOnInteraction(queryClient, 'system');

  return {
    prefetchSystem,
    prefetchOnHover: prefetchOnInteraction.onMouseEnter,
    prefetchOnFocus: prefetchOnInteraction.onFocus,
  };
}

/**
 * General-purpose prefetch hook for navigation links
 * Usage: Apply to navigation links for improved perceived performance
 *
 * Example:
 * ```tsx
 * const { prefetchOnHover } = useNavigationPrefetch('dashboard');
 *
 * <Link href="/dashboard" onMouseEnter={prefetchOnHover}>
 *   Dashboard
 * </Link>
 * ```
 */
export function useNavigationPrefetch(strategy: keyof typeof prefetchStrategies) {
  const queryClient = useQueryClient();

  const prefetchOnInteraction = createPrefetchOnInteraction(queryClient, strategy);

  return {
    prefetchOnHover: prefetchOnInteraction.onMouseEnter,
    prefetchOnFocus: prefetchOnInteraction.onFocus,
  };
}
