/**
 * Usage Query Hooks
 *
 * TanStack Query hooks for chat usage tracking and quotas
 * Following patterns from subscriptions.ts
 */

'use client';

import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/data/query-keys';
import {
  checkMessageQuotaService,
  checkThreadQuotaService,
  getUserUsageStatsService,
} from '@/services/api';

/**
 * Hook to fetch user usage statistics
 * Returns comprehensive usage data for threads and messages
 * Protected endpoint - requires authentication
 *
 * Stale time: 1 minute (usage data should be relatively fresh)
 */
export function useUsageStatsQuery() {
  const { data: session, isPending } = useSession();
  const isAuthenticated = !isPending && !!session?.user?.id;

  return useQuery({
    queryKey: queryKeys.usage.stats(),
    queryFn: getUserUsageStatsService,
    staleTime: 1 * 60 * 1000, // 1 minute
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
 * Hook to check thread creation quota
 * Returns whether user can create more threads
 * Protected endpoint - requires authentication
 *
 * Stale time: 30 seconds (quota checks should be fresh)
 */
export function useThreadQuotaQuery() {
  const { data: session, isPending } = useSession();
  const isAuthenticated = !isPending && !!session?.user?.id;

  return useQuery({
    queryKey: queryKeys.usage.threadQuota(),
    queryFn: checkThreadQuotaService,
    staleTime: 30 * 1000, // 30 seconds
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
    enabled: isAuthenticated,
    throwOnError: false,
  });
}

/**
 * Hook to check message creation quota
 * Returns whether user can send more messages
 * Protected endpoint - requires authentication
 *
 * Stale time: 30 seconds (quota checks should be fresh)
 */
export function useMessageQuotaQuery() {
  const { data: session, isPending } = useSession();
  const isAuthenticated = !isPending && !!session?.user?.id;

  return useQuery({
    queryKey: queryKeys.usage.messageQuota(),
    queryFn: checkMessageQuotaService,
    staleTime: 30 * 1000, // 30 seconds
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
    enabled: isAuthenticated,
    throwOnError: false,
  });
}
