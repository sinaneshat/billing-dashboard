import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { queryKeys } from '@/lib/data/query-keys';
import { logError } from '@/lib/utils/safe-logger';
import { getContractStatusService } from '@/services/api/payment-methods';

// All types are now inferred from the backend API following established patterns

/**
 * Hook to check user's direct debit contract status
 * Uses backend API endpoint following established patterns
 * All types inferred from RPC client for complete type safety
 *
 * @returns Query result with DirectDebitContract information
 */
export function useDirectDebitContract() {
  const t = useTranslations();

  return useQuery({
    queryKey: queryKeys.directDebit.contractStatus,
    queryFn: async () => {
      try {
        const result = await getContractStatusService();

        if (!result.success) {
          logError('Failed to get contract status', { error: result });
          return {
            status: 'no_contract' as const,
            canMakePayments: false,
            needsSetup: true,
            message: t('bankSetup.status.noContract'),
          };
        }

        return result.data;
      } catch (error) {
        logError('Failed to get contract status', error);
        return {
          status: 'no_contract' as const,
          canMakePayments: false,
          needsSetup: true,
          message: t('bankSetup.status.noContract'),
        };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && error.message.includes('Authentication')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook to check if user can create subscriptions
 * Uses the new backend API following established patterns
 *
 * @returns boolean indicating if user can create subscriptions
 */
export function useCanCreateSubscriptions(): boolean {
  const { data: contract } = useDirectDebitContract();
  return contract?.canMakePayments ?? false;
}
