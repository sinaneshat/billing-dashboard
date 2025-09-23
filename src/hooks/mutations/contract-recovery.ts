import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { logError } from '@/lib/utils/safe-logger';
import { recoverDirectDebitContractService } from '@/services/api/payment-methods';

/**
 * Hook to recover failed contract verifications
 * Uses the recovery endpoint to verify contracts that weren't properly processed
 */
export function useRecoverContractMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymanAuthority: string) => {
      const response = await recoverDirectDebitContractService({
        json: { paymanAuthority },
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        // Invalidate payment methods to show the recovered contract
        queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list });
        queryClient.invalidateQueries({ queryKey: queryKeys.directDebit.contractStatus });
      }
    },
    onError: (error) => {
      logError('Failed to recover contract', error);
    },
    retry: false, // Recovery is one-time - don't auto-retry
    throwOnError: false,
  });
}
