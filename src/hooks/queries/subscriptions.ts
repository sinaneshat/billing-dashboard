/**
 * Subscription Query Hooks
 *
 * TanStack Query hooks for Stripe subscriptions
 * Following patterns from commit a24d1f67d90381a2e181818f93b6a7ad63c062cc
 */

'use client';

import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/data/query-keys';
import { getSubscriptionService, getSubscriptionsService } from '@/services/api';

/**
 * Hook to fetch all user subscriptions
 * Protected endpoint - requires authentication
 *
 * Stale time: 2 minutes (subscription data moderately fresh)
 */
export function useSubscriptionsQuery() {
  const { data: session, isPending } = useSession();
  const isAuthenticated = !isPending && !!session?.user?.id;

  return useQuery({
    queryKey: queryKeys.subscriptions.list(),
    queryFn: getSubscriptionsService,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && error.message.includes('Authentication')) {
        return false;
      }
      // Don't retry on client errors (4xx)
      const errorStatus = (error as { status?: number })?.status;
      if (errorStatus && errorStatus >= 400 && errorStatus < 500) {
        return false;
      }
      return failureCount < 2;
    },
    enabled: isAuthenticated, // Only fetch when authenticated
    throwOnError: false,
  });
}

/**
 * Hook to fetch a specific subscription by ID
 * Protected endpoint - requires authentication and ownership
 *
 * @param subscriptionId - Stripe subscription ID
 */
export function useSubscriptionQuery(subscriptionId: string) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return useQuery({
    queryKey: queryKeys.subscriptions.detail(subscriptionId),
    queryFn: () => getSubscriptionService(subscriptionId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: isAuthenticated && !!subscriptionId,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('Authentication')) {
        return false;
      }
      const errorStatus = (error as { status?: number })?.status;
      if (errorStatus && errorStatus >= 400 && errorStatus < 500) {
        return false;
      }
      return failureCount < 2;
    },
    throwOnError: false,
  });
}

/**
 * Hook to get current active subscription
 * Reuses subscriptions list cache with data selection
 *
 * This pattern prevents making a separate API call by transforming
 * the cached subscriptions data to find the active subscription
 */
export function useCurrentSubscriptionQuery() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return useQuery({
    queryKey: queryKeys.subscriptions.list(), // Reuse list cache
    queryFn: getSubscriptionsService,
    staleTime: 2 * 60 * 1000,
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('Authentication')) {
        return false;
      }
      const errorStatus = (error as { status?: number })?.status;
      if (errorStatus && errorStatus >= 400 && errorStatus < 500) {
        return false;
      }
      return failureCount < 2;
    },
    throwOnError: false,
    // Transform data to get current subscription
    select: (data) => {
      if (data.success && data.data && Array.isArray(data.data.subscriptions)) {
        // Find active subscription or return first one
        return (
          data.data.subscriptions.find(sub => sub.status === 'active')
          || data.data.subscriptions[0]
        );
      }
      return null;
    },
  });
}
