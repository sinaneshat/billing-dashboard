import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/data/query-keys';
import { getBankListService, getPaymentMethodsService } from '@/services/api/payment-methods';

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
