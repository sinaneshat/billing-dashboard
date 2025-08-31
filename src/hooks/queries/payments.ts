import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import type {
  GetPaymentsRequest,
  PaymentCallbackRequest,
} from '@/services/api/payments';
import {
  getPaymentsService,
  handlePaymentCallbackService,
} from '@/services/api/payments';

/**
 * Hook to fetch payment history for the current user
 * Following the Shakewell pattern for React Query hooks
 */
export function usePaymentHistoryQuery(args?: GetPaymentsRequest) {
  return useQuery({
    queryKey: queryKeys.payments.history(args),
    queryFn: () => getPaymentsService(args),
    staleTime: 1 * 60 * 1000, // 1 minute - payment data changes frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

/**
 * Hook to handle payment callback from ZarinPal
 * This is typically used on payment callback pages
 * Note: This is a special case query that triggers side effects
 */
export function usePaymentCallbackQuery(args: PaymentCallbackRequest, enabled: boolean = true) {
  return useQuery({
    queryKey: ['payments', 'callback', args],
    queryFn: () => handlePaymentCallbackService(args),
    staleTime: 0, // Never stale - always fresh for callbacks
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once for callbacks
    enabled: enabled && !!args.query, // Only run if callback params exist
    refetchOnWindowFocus: false, // Don't refetch on window focus for callbacks
    refetchOnMount: false, // Don't refetch on remount for callbacks
  });
}

/**
 * Hook to prefetch payment history data
 * Useful for optimistic loading on dashboard
 */
export function usePrefetchPaymentHistory() {
  const queryClient = useQueryClient();

  return (args?: GetPaymentsRequest) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.payments.history(args),
      queryFn: () => getPaymentsService(args),
      staleTime: 1 * 60 * 1000,
    });
  };
}

/**
 * Hook to get payments with infinite scrolling support
 * Useful for long payment histories
 */
export function usePaymentHistoryInfiniteQuery(filters?: Record<string, unknown>) {
  return useInfiniteQuery({
    queryKey: queryKeys.payments.history(filters),
    queryFn: ({ pageParam = 1 }) =>
      getPaymentsService({
        query: {
          ...filters,
          page: pageParam.toString(),
          limit: '10',
        },
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // Assume API returns hasMore or similar pagination info
      if (lastPage.success && lastPage.data && Array.isArray(lastPage.data)) {
        const hasMore = lastPage.data.length === 10; // If we got a full page, there might be more
        return hasMore ? allPages.length + 1 : undefined;
      }
      return undefined;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
