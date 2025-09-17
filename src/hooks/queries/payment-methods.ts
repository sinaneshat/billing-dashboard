import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { getBankListService, getPaymentMethodsService } from '@/services/api/payment-methods';

/**
 * Hook to fetch ALL user payment methods (no pagination)
 * Context7 official pattern - EXACT match with server prefetch
 */
export function usePaymentMethodsQuery() {
  return useQuery({
    queryKey: queryKeys.paymentMethods.list, // CRITICAL FIX: Static array like official examples
    queryFn: getPaymentMethodsService,
    staleTime: 5 * 60 * 1000, // CRITICAL FIX: Match server prefetch (5 minutes)
    retry: 2,
    throwOnError: false,
  });
}

/**
 * Hook to fetch available banks for direct debit contract signing
 * Used during direct debit contract setup flow
 */
export function useBankListQuery() {
  return useQuery({
    queryKey: queryKeys.paymentMethods.bankList,
    queryFn: getBankListService,
    staleTime: 5 * 60 * 1000, // Banks list is relatively stable - 5 minutes cache
    retry: 2,
    throwOnError: false,
    // Only fetch when explicitly needed - not automatically on component mount
    enabled: false,
  });
}
