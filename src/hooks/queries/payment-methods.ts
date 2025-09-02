import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { getPaymentMethodsService } from '@/services/api/payment-methods';

/**
 * Hook to fetch ALL user payment methods (no pagination)
 * Simple TanStack Query pattern - shows all payment methods always
 */
export function usePaymentMethodsQuery() {
  return useQuery({
    queryKey: queryKeys.paymentMethods.list(),
    queryFn: () => getPaymentMethodsService(), // No args = fetch all payment methods
    staleTime: 5 * 60 * 1000, // 5 minutes - payment methods are relatively stable
    retry: 2,
    throwOnError: false,
  });
}

/**
 * Simple prefetch function for backward compatibility
 */
export function prefetchPaymentMethods() {
  // Placeholder function for backward compatibility
  return () => {};
}
