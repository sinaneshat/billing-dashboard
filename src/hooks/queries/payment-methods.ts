import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/data/query-keys';
import { getPaymentMethodsService } from '@/services/api/payment-methods';

/**
 * Hook to fetch ALL user payment methods (no pagination)
 * Context7 official pattern - EXACT match with server prefetch
 * AUTHENTICATION FIX: Only fetch when user is authenticated to prevent 401 errors
 */
export function usePaymentMethodsQuery() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return useQuery({
    queryKey: queryKeys.paymentMethods.list, // CRITICAL FIX: Static array like official examples
    queryFn: getPaymentMethodsService,
    staleTime: 5 * 60 * 1000, // CRITICAL FIX: Match server prefetch (5 minutes)
    retry: 2,
    throwOnError: false,
    // AUTHENTICATION FIX: Only fetch when authenticated to prevent 401 errors during app initialization
    enabled: isAuthenticated,
  });
}

/**
 * Hook to fetch available banks for direct debit contract signing
 * @deprecated Banks are now returned in createDirectDebitContractService response
 * This hook is kept for backwards compatibility but should not be used
 */
export function useBankListQuery() {
  return useQuery({
    queryKey: queryKeys.paymentMethods.bankList,
    queryFn: () => {
      throw new Error('useBankListQuery is deprecated. Banks are now returned in createDirectDebitContractService response.');
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
    throwOnError: false,
    enabled: false,
  });
}
