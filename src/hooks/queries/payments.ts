import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { getPaymentsService } from '@/services/api/payments';

/**
 * Hook to fetch all user payments (billing history)
 * Context7 official pattern - EXACT match with server prefetch
 */
export function usePaymentsQuery() {
  return useQuery({
    queryKey: queryKeys.payments.list, // CRITICAL FIX: Static array like official examples
    queryFn: getPaymentsService,
    staleTime: 60 * 1000, // CRITICAL FIX: Match Context7 examples (60 seconds)
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
