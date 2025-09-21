import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/data/query-keys';
import { analyzeDirectDebitContract, canCreateSubscriptions } from '@/services/api/direct-debit-analysis';
import { getPaymentMethodsService } from '@/services/api/payment-methods';

/**
 * Hook to fetch and analyze direct debit contract status
 * Uses service layer for business logic while maintaining clean data interface
 * All types inferred from RPC client for complete type safety
 *
 * @returns Query result with analyzed contract status
 */
export function useDirectDebitContract() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return useQuery({
    queryKey: queryKeys.directDebit.contractStatus,
    queryFn: async () => {
      const paymentMethodsResponse = await getPaymentMethodsService();
      return analyzeDirectDebitContract(paymentMethodsResponse);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && error.message.includes('Authentication')) {
        return false;
      }
      return failureCount < 2;
    },
    enabled: isAuthenticated,
    throwOnError: false,
  });
}

/**
 * Hook to check if user can create subscriptions
 * Uses service layer analysis function for business logic
 *
 * @returns boolean indicating if user can create subscriptions
 */
export function useCanCreateSubscriptions(): boolean {
  const { data: contractStatus } = useDirectDebitContract();
  return contractStatus ? canCreateSubscriptions(contractStatus) : false;
}
