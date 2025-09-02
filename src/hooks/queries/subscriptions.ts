import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import {
  getSubscriptionService,
  getSubscriptionsService,
} from '@/services/api/subscriptions';

/**
 * Hook to fetch ALL user subscriptions (no pagination)
 * Simple TanStack Query pattern - shows all records always
 */
export function useSubscriptionsQuery() {
  return useQuery({
    queryKey: queryKeys.subscriptions.list(),
    queryFn: () => getSubscriptionsService(), // No args = fetch all records
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    throwOnError: false,
  });
}

/**
 * Hook to fetch single subscription by ID
 * Simple TanStack Query pattern
 */
export function useSubscriptionQuery(subscriptionId: string) {
  return useQuery({
    queryKey: queryKeys.subscriptions.detail(subscriptionId),
    queryFn: () => getSubscriptionService(subscriptionId),
    staleTime: 2 * 60 * 1000,
    retry: 2,
    throwOnError: false,
    enabled: !!subscriptionId,
  });
}

/**
 * Simple current subscription query for backward compatibility
 * Uses SAME query key as subscriptions list to leverage prefetched cache
 * Just selects the active subscription from the already cached data
 */
export function useCurrentSubscriptionQuery() {
  return useQuery({
    queryKey: queryKeys.subscriptions.list(), // ✅ Same key as prefetch and list query
    queryFn: () => getSubscriptionsService(),
    staleTime: 2 * 60 * 1000,
    retry: 2,
    throwOnError: false,
    select: (data) => {
      if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
        return data.data.find((sub: { status: string }) => sub.status === 'active') || data.data[0];
      }
      return null;
    },
  });
}
