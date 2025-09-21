import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { logError } from '@/lib/utils/safe-logger';
import type {
  CreateDirectDebitContractRequest,
  VerifyDirectDebitContractRequest,
} from '@/services/api/payment-methods';
import {
  cancelDirectDebitContractService,
  createDirectDebitContractService,
  verifyDirectDebitContractService,
} from '@/services/api/payment-methods';

// Traditional payment method creation removed - use direct debit contract verification

// ============================================================================
//  Direct Debit Contract Mutation Hooks (NEW - ZarinPal Payman API)
// ============================================================================

/**
 * Hook to initiate direct debit contract setup (Step 1)
 * Returns available banks and contract signing URL template
 */
export function useCreateDirectDebitContractMutation() {
  return useMutation({
    mutationFn: async (args: CreateDirectDebitContractRequest) => {
      const result = await createDirectDebitContractService(args);
      return result;
    },
    onMutate: async (variables) => {
      // Return context for potential error handling
      return { variables, timestamp: Date.now() };
    },
    onError: (error, _variables, _context) => {
      logError('Failed to initiate direct debit contract', error);
    },
    onSettled: (_data, _error, _variables, _context) => {
      // Log completion for debugging/analytics
    },
    retry: false, // Contract setup should not auto-retry - requires user action
    throwOnError: false, // Handle errors in component state
  });
}

/**
 * Hook to verify direct debit contract after user returns from bank (Step 2)
 * Creates payment method with contract signature if verification successful
 */
export function useVerifyDirectDebitContractMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: VerifyDirectDebitContractRequest) => {
      const result = await verifyDirectDebitContractService(args);
      return result;
    },
    onSuccess: (data) => {
      // Only invalidate the specific query being used to avoid redundant requests
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list });

      // Optionally add the new payment method to cache if contract was verified
      if (data.success && data.data?.signature && data.data?.paymentMethod) {
        queryClient.setQueryData(queryKeys.paymentMethods.list, (old: unknown) => {
          const oldData = old as { success?: boolean; data?: unknown[] };
          if (oldData?.success && Array.isArray(oldData.data)) {
            // Direct debit contract creates a new payment method, invalidate to refetch
            return old; // Just invalidate, don't optimistically update since we don't have full data
          }
          return old;
        });
      }
    },
    onError: (error) => {
      logError('Failed to verify direct debit contract', error);
    },
    retry: false, // Contract verification should not auto-retry - it's a one-time callback
  });
}

/**
 * Get Available Banks for Direct Debit Contract Signing
 * @deprecated Banks are now returned in createDirectDebitContractService response
 * This hook is kept for backwards compatibility but should not be used
 */
export function useGetBankListMutation() {
  return useMutation({
    mutationFn: async () => {
      throw new Error('useGetBankListMutation is deprecated. Banks are now returned in useCreateDirectDebitContractMutation response.');
    },
    onError: (error) => {
      logError('Attempted to use deprecated getBankListService', error);
    },
    retry: false,
  });
}

/**
 * Legacy alias for useCreateDirectDebitContractMutation
 * @deprecated Use useCreateDirectDebitContractMutation instead
 */
export const useInitiateDirectDebitContractMutation = useCreateDirectDebitContractMutation;

/**
 * Hook to cancel direct debit contract
 * Legally required - users must be able to cancel contracts
 */
export function useCancelDirectDebitContractMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const result = await cancelDirectDebitContractService({
        param: { id: paymentMethodId },
      });
      return result;
    },
    onMutate: async (paymentMethodId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.paymentMethods.list });

      // Snapshot the previous value for rollback
      const previousPaymentMethods = queryClient.getQueryData(queryKeys.paymentMethods.list);

      // Optimistically update payment methods list
      queryClient.setQueryData(queryKeys.paymentMethods.list, (old: unknown) => {
        const oldData = old as { success?: boolean; data?: Array<{ id: string; isActive: boolean; contractStatus: string }> };
        if (oldData?.success && Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.map(pm => ({
              ...pm,
              isActive: pm.id === paymentMethodId ? false : pm.isActive,
              contractStatus: pm.id === paymentMethodId ? 'cancelled_by_user' : pm.contractStatus,
            })),
          };
        }
        return old;
      });

      return { previousPaymentMethods };
    },
    onError: (error, _variables, context) => {
      logError('Failed to cancel direct debit contract', error);

      // Rollback optimistic update on error
      if (context?.previousPaymentMethods) {
        queryClient.setQueryData(queryKeys.paymentMethods.list, context.previousPaymentMethods);
      }

      // Show user-friendly error message
      let errorMessage = 'Failed to cancel contract. Please try again or contact support.';

      if (error instanceof Error) {
        if (error.message.includes('Not found')) {
          errorMessage = 'Contract not found or already cancelled.';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Connection error. Please try again.';
        } else if (error.message.includes('Authentication')) {
          errorMessage = 'Authentication required. Please sign in again.';
        }
      }

      // Log error for debugging (toast will be handled by component layer)
      logError('Contract cancellation failed', { errorMessage, component: 'contract-cancellation' });
    },
    onSuccess: (data) => {
      // Only invalidate the specific queries being used to avoid redundant requests
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.list });

      // Log success for debugging (toast will be handled by component layer)
      if (data.success) {
        logError('Contract cancelled successfully', { component: 'contract-cancellation' });
      }
    },
    retry: 1,
  });
}
