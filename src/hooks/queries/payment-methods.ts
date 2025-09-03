import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { getPaymentMethodsService } from '@/services/api/payment-methods';

/**
 * Hook to fetch ALL user payment methods (no pagination)
 * Context7 official pattern - EXACT match with server prefetch
 */
export function usePaymentMethodsQuery() {
  return useQuery({
    queryKey: queryKeys.paymentMethods.list, // CRITICAL FIX: Static array like official examples
    queryFn: getPaymentMethodsService,
    staleTime: 60 * 1000, // CRITICAL FIX: Match Context7 examples (60 seconds)
    retry: 2,
    throwOnError: false,
  });
}
