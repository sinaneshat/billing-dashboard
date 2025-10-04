/**
 * Subscription Management Mutation Hooks
 *
 * TanStack Mutation hooks for in-app subscription changes
 * Following Theo's "Stay Sane with Stripe" pattern - handle everything in-app
 *
 * Operations:
 * - Switch: Intelligently handles upgrades (immediate with proration) and downgrades (at period end)
 * - Cancel: Cancel subscription (at period end or immediately)
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import type { getSubscriptionsService } from '@/services/api';
import {
  cancelSubscriptionService,
  switchSubscriptionService,
} from '@/services/api';

/**
 * Hook to switch subscription to a different price plan
 * Protected endpoint - requires authentication
 *
 * Automatically handles:
 * - Upgrades (new > current): Applied immediately with proration
 * - Downgrades (new < current): Scheduled for end of billing period
 * - Updates cache immediately with fresh data from API response
 * - Invalidates subscription queries to ensure consistency
 */
export function useSwitchSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: switchSubscriptionService,
    onSuccess: (response) => {
      // Immediately update the subscriptions list cache with the updated subscription
      if (response.success && response.data?.subscription) {
        const updatedSubscription = response.data.subscription;

        queryClient.setQueryData<Awaited<ReturnType<typeof getSubscriptionsService>>>(
          queryKeys.subscriptions.list(),
          (oldData) => {
            if (!oldData?.success || !oldData.data?.subscriptions) {
              return oldData;
            }

            // Replace the updated subscription in the list
            const updatedSubscriptions = oldData.data.subscriptions.map(sub =>
              sub.id === updatedSubscription.id ? updatedSubscription : sub,
            );

            return {
              ...oldData,
              data: {
                ...oldData.data,
                subscriptions: updatedSubscriptions,
              },
            };
          },
        );
      }

      // Invalidate all subscription-related queries to ensure UI updates
      void queryClient.invalidateQueries({
        queryKey: queryKeys.subscriptions.all,
        refetchType: 'active',
      });
    },
    onError: (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to switch subscription', error);
      }
    },
    retry: (failureCount, error: unknown) => {
      // Don't retry on client errors (4xx)
      const httpError = error as { status?: number };
      if (httpError?.status && httpError.status >= 400 && httpError.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    throwOnError: false,
  });
}

/**
 * Hook to cancel subscription
 * Protected endpoint - requires authentication
 *
 * - Default: Cancel at period end (user retains access)
 * - Optional: Cancel immediately (user loses access)
 * - Updates cache immediately with fresh data from API response
 * - Invalidates subscription queries to ensure consistency
 */
export function useCancelSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelSubscriptionService,
    onSuccess: (response) => {
      // Immediately update the subscriptions list cache with the updated subscription
      if (response.success && response.data?.subscription) {
        const updatedSubscription = response.data.subscription;

        queryClient.setQueryData<Awaited<ReturnType<typeof getSubscriptionsService>>>(
          queryKeys.subscriptions.list(),
          (oldData) => {
            if (!oldData?.success || !oldData.data?.subscriptions) {
              return oldData;
            }

            // Replace the updated subscription in the list
            const updatedSubscriptions = oldData.data.subscriptions.map(sub =>
              sub.id === updatedSubscription.id ? updatedSubscription : sub,
            );

            return {
              ...oldData,
              data: {
                ...oldData.data,
                subscriptions: updatedSubscriptions,
              },
            };
          },
        );
      }

      // Invalidate all subscription-related queries to ensure UI updates
      void queryClient.invalidateQueries({
        queryKey: queryKeys.subscriptions.all,
        refetchType: 'active',
      });
    },
    onError: (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to cancel subscription', error);
      }
    },
    retry: (failureCount, error: unknown) => {
      // Don't retry on client errors (4xx)
      const httpError = error as { status?: number };
      if (httpError?.status && httpError.status >= 400 && httpError.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    throwOnError: false,
  });
}
