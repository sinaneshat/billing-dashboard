import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import type {
  GetSubscriptionsRequest,
} from '@/services/api/subscriptions';
import {
  getSubscriptionsService,
} from '@/services/api/subscriptions';

/**
 * Hook to fetch all user subscriptions
 * Following the Shakewell pattern for React Query hooks
 */
export function useSubscriptionsQuery(args?: GetSubscriptionsRequest) {
  return useQuery({
    queryKey: queryKeys.subscriptions.list(args),
    queryFn: () => getSubscriptionsService(args),
    staleTime: 2 * 60 * 1000, // 2 minutes - subscriptions change fairly frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch current user's active subscription
 * This is a specialized query for the most common use case
 */
export function useCurrentSubscriptionQuery() {
  return useQuery({
    queryKey: queryKeys.subscriptions.current(),
    queryFn: () => getSubscriptionsService({ query: { status: 'active', limit: '1' } }),
    staleTime: 1 * 60 * 1000, // 1 minute - current subscription is critical
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    select: (data) => {
      // Extract the first subscription if successful
      if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
        return data.data[0];
      }
      return null;
    },
  });
}

/**
 * Hook to prefetch subscriptions data
 * Useful for optimistic loading
 */
export function usePrefetchSubscriptions() {
  const queryClient = useQueryClient();

  return (args?: GetSubscriptionsRequest) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.list(args),
      queryFn: () => getSubscriptionsService(args),
      staleTime: 2 * 60 * 1000,
    });
  };
}
