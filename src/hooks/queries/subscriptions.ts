import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import {
  getSubscriptionService,
  getSubscriptionsService,
} from '@/services/api/subscriptions';

/**
 * Hook to fetch ALL user subscriptions (no pagination)
 * Context7 official pattern - EXACT match with server prefetch
 */
export function useSubscriptionsQuery() {
  return useQuery({
    queryKey: queryKeys.subscriptions.list, // CRITICAL FIX: Static array like official examples
    queryFn: getSubscriptionsService,
    staleTime: 60 * 1000, // CRITICAL FIX: Match Context7 examples (60 seconds)
    retry: 2,
    throwOnError: false,
  });
}

/**
 * Hook to fetch single subscription by ID
 * Context7 official pattern
 */
export function useSubscriptionQuery(subscriptionId: string) {
  return useQuery({
    queryKey: queryKeys.subscriptions.detail(subscriptionId),
    queryFn: () => getSubscriptionService(subscriptionId),
    staleTime: 60 * 1000, // CRITICAL FIX: Match Context7 examples (60 seconds)
    retry: 2,
    throwOnError: false,
    enabled: !!subscriptionId,
  });
}

/**
 * Current subscription query - Context7 official pattern
 * Uses SAME query key as subscriptions list to leverage prefetched cache
 * Just selects the active subscription from the already cached data
 */
export function useCurrentSubscriptionQuery() {
  return useQuery({
    queryKey: queryKeys.subscriptions.list, // ✅ CRITICAL FIX: Static array - same key as prefetch
    queryFn: getSubscriptionsService, // CRITICAL FIX: No arrow wrapper - match server
    staleTime: 60 * 1000, // CRITICAL FIX: Match Context7 examples (60 seconds)
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
