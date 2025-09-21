import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/data/query-keys';
import { getPaymentsService } from '@/services/api/payments';

/**
 * Hook to fetch all user payments (billing history)
 * Requires authentication - only fetches when user is authenticated
 * Shorter stale time for financial data to ensure accuracy
 */
export function usePaymentsQuery() {
  const { data: session, isPending } = useSession();
  const isAuthenticated = !isPending && !!session?.user?.id;

  return useQuery({
    queryKey: queryKeys.payments.list,
    queryFn: getPaymentsService,
    staleTime: 60 * 1000, // 1 minute - financial data should be fresh
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
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
