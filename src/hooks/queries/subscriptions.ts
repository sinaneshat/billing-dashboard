import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/data/query-keys';
import {
  getSubscriptionService,
  getSubscriptionsService,
} from '@/services/api/subscriptions';

/**
 * Hook to fetch ALL user subscriptions (no pagination)
 * Context7 official pattern - EXACT match with server prefetch
 * AUTHENTICATION FIX: Only fetch when user is authenticated to prevent 401 errors
 */
export function useSubscriptionsQuery() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return useQuery({
    queryKey: queryKeys.subscriptions.list, // CRITICAL FIX: Static array like official examples
    queryFn: getSubscriptionsService,
    staleTime: 2 * 60 * 1000, // CRITICAL FIX: Match server prefetch (2 minutes)
    retry: 2,
    throwOnError: false,
    // AUTHENTICATION FIX: Only fetch when authenticated to prevent 401 errors during app initialization
    enabled: isAuthenticated,
  });
}

/**
 * Hook to fetch single subscription by ID
 * Context7 official pattern
 * AUTHENTICATION FIX: Only fetch when user is authenticated to prevent 401 errors
 */
export function useSubscriptionQuery(subscriptionId: string) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return useQuery({
    queryKey: queryKeys.subscriptions.detail(subscriptionId),
    queryFn: () => getSubscriptionService(subscriptionId),
    staleTime: 2 * 60 * 1000, // CRITICAL FIX: Match server prefetch (2 minutes)
    retry: 2,
    throwOnError: false,
    // AUTHENTICATION FIX: Only fetch when authenticated AND subscription ID is provided
    enabled: isAuthenticated && !!subscriptionId,
  });
}

/**
 * Current subscription query - Context7 official pattern
 * Uses SAME query key as subscriptions list to leverage prefetched cache
 * Just selects the active subscription from the already cached data
 * AUTHENTICATION FIX: Only fetch when user is authenticated to prevent 401 errors
 */
export function useCurrentSubscriptionQuery() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return useQuery({
    queryKey: queryKeys.subscriptions.list, // CRITICAL FIX: Static array - same key as prefetch
    queryFn: getSubscriptionsService, // CRITICAL FIX: No arrow wrapper - match server
    staleTime: 2 * 60 * 1000, // CRITICAL FIX: Match server prefetch (2 minutes)
    retry: 2,
    throwOnError: false,
    // AUTHENTICATION FIX: Only fetch when authenticated to prevent 401 errors during app initialization
    enabled: isAuthenticated,
    select: (data) => {
      if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
        return data.data.find((sub: { status: string }) => sub.status === 'active') || data.data[0];
      }
      return null;
    },
  });
}
