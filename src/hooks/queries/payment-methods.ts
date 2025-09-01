import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import type {
  GetPaymentMethodsRequest,
} from '@/services/api/payment-methods';
import {
  getPaymentMethodsService,
} from '@/services/api/payment-methods';

/**
 * Hook to fetch all user payment methods
 * Following the Shakewell pattern for React Query hooks
 */
export function usePaymentMethodsQuery(args?: GetPaymentMethodsRequest) {
  return useQuery({
    queryKey: queryKeys.paymentMethods.list(args),
    queryFn: () => getPaymentMethodsService(args),
    staleTime: 5 * 60 * 1000, // 5 minutes - payment methods are relatively stable
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
  });
}

/**
 * Hook to prefetch payment methods data
 * Useful for optimistic loading
 */
export function usePrefetchPaymentMethods() {
  const queryClient = useQueryClient();

  return (args?: GetPaymentMethodsRequest) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.paymentMethods.list(args),
      queryFn: () => getPaymentMethodsService(args),
      staleTime: 5 * 60 * 1000,
    });
  };
}
