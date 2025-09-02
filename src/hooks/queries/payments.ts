import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { getPaymentsService } from '@/services/api/payments';

/**
 * Hook to fetch all user payments (billing history)
 * Following the Shakewell pattern for React Query hooks
 */
export function usePaymentsQuery() {
  return useQuery({
    queryKey: queryKeys.payments.list(),
    queryFn: () => getPaymentsService(),
    staleTime: 2 * 60 * 1000, // 2 minutes - payment history is fairly stable
    gcTime: 10 * 60 * 1000, // 10 minutes
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
      // Retry up to 3 times for server errors and network errors
      return failureCount < 3;
    },
    retryDelay: attemptIndex => Math.min(attemptIndex > 1 ? 2 ** attemptIndex * 1000 : 1000, 30 * 1000),
    throwOnError: false, // Handle errors in component state
  });
}

/**
 * Hook to prefetch payments data
 * Useful for optimistic loading following TanStack Query best practices
 */
export function usePrefetchPayments() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.payments.list(),
      queryFn: () => getPaymentsService(),
      staleTime: 2 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('Authentication')) {
          return false;
        }
        const errorStatus = (error as { status?: number })?.status;
        if (errorStatus && errorStatus >= 400 && errorStatus < 500) {
          return false;
        }
        return failureCount < 2; // Less aggressive retrying for prefetch
      },
    });
  };
}

/**
 * Hook for prefetching payments on interaction
 * Payment history is important data for billing dashboard
 */
export function usePrefetchPaymentsOnInteraction() {
  const queryClient = useQueryClient();
  let prefetchPromise: Promise<void> | null = null;

  const prefetch = () => {
    if (!prefetchPromise) {
      prefetchPromise = queryClient.prefetchQuery({
        queryKey: queryKeys.payments.list(),
        queryFn: () => getPaymentsService(),
        staleTime: 2 * 60 * 1000,
      });
    }
    return prefetchPromise;
  };

  return {
    prefetchOnHover: prefetch,
    prefetchOnFocus: prefetch,
  };
}
