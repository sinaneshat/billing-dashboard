import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/data/query-keys';
import {
  getSubscriptionService,
  getSubscriptionsService,
} from '@/services/api/subscriptions';

/**
 * Hook to fetch all user subscriptions (no pagination)
 * Requires authentication - only fetches when user is authenticated
 * Medium stale time for subscription data
 */
export function useSubscriptionsQuery() {
  const { data: session, isPending } = useSession();
  const isAuthenticated = !isPending && !!session?.user?.id;

  return useQuery({
    queryKey: queryKeys.subscriptions.list,
    queryFn: getSubscriptionsService,
    staleTime: 2 * 60 * 1000, // 2 minutes - subscription data moderately fresh
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
    enabled: isAuthenticated,
    throwOnError: false,
  });
}

/**
 * Hook to fetch single subscription by ID
 * Requires authentication and valid subscription ID
 */
export function useSubscriptionQuery(subscriptionId: string) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return useQuery({
    queryKey: queryKeys.subscriptions.detail(subscriptionId),
    queryFn: () => getSubscriptionService(subscriptionId),
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
    enabled: isAuthenticated && !!subscriptionId,
    throwOnError: false,
  });
}

/**
 * Hook to get the current active subscription
 * Uses same query key as subscriptions list to leverage cache
 * Selects the active subscription from cached data
 */
export function useCurrentSubscriptionQuery() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return useQuery({
    queryKey: queryKeys.subscriptions.list, // Reuse list cache
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
    enabled: isAuthenticated,
    throwOnError: false,
    select: (data) => {
      if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
        return data.data.find((sub: { status: string }) => sub.status === 'active') || data.data[0];
      }
      return null;
    },
  });
}
