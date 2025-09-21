import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { logError } from '@/lib/utils/safe-logger';
import {
  cancelDirectDebitContractService,
  createDirectDebitContractService,
  setDefaultPaymentMethodService,
  verifyDirectDebitContractService,
} from '@/services/api';

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
    mutationFn: createDirectDebitContractService,
    onError: (error) => {
      logError('Failed to initiate direct debit contract', error);
    },
    retry: false, // Contract setup should not auto-retry - requires user action
    throwOnError: false,
  });
}

/**
 * Hook to verify direct debit contract after user returns from bank (Step 2)
 * Creates payment method with contract signature if verification successful
 */
export function useVerifyDirectDebitContractMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyDirectDebitContractService,
    onSuccess: () => {
      // Invalidate payment methods and direct debit contract status
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.directDebit.contractStatus });
    },
    onError: (error) => {
      logError('Failed to verify direct debit contract', error);
    },
    retry: false, // Contract verification is one-time - don't retry
    throwOnError: false,
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
    mutationFn: (paymentMethodId: string) =>
      cancelDirectDebitContractService({ param: { id: paymentMethodId } }),
    onMutate: async (paymentMethodId: string) => {
      // Cancel outgoing refetches and snapshot previous value
      await queryClient.cancelQueries({ queryKey: queryKeys.paymentMethods.list });
      const previousPaymentMethods = queryClient.getQueryData(queryKeys.paymentMethods.list);

      // Optimistically update payment method status
      queryClient.setQueryData(queryKeys.paymentMethods.list, (old: unknown) => {
        const response = old as { success?: boolean; data?: Array<Record<string, unknown>> };
        if (response?.success && Array.isArray(response.data)) {
          return {
            ...response,
            data: response.data.map(pm => ({
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
      // Rollback optimistic update on error
      if (context?.previousPaymentMethods) {
        queryClient.setQueryData(queryKeys.paymentMethods.list, context.previousPaymentMethods);
      }
      logError('Failed to cancel direct debit contract', error);
    },
    onSuccess: () => {
      // Invalidate payment methods and related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.directDebit.contractStatus });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.list });
    },
    retry: (failureCount, error: unknown) => {
      // Don't retry on client errors (4xx)
      const httpError = error as { status?: number };
      if (httpError?.status && httpError.status >= 400 && httpError.status < 500) {
        return false;
      }
      return failureCount < 1;
    },
    throwOnError: false,
  });
}

/**
 * Hook to set a payment method as default
 * Updates the user's default payment method for subscriptions
 */
export function useSetDefaultPaymentMethodMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setDefaultPaymentMethodService,
    onMutate: async (args) => {
      const paymentMethodId = args.param.id;

      // Cancel outgoing refetches and snapshot previous value
      await queryClient.cancelQueries({ queryKey: queryKeys.paymentMethods.list });
      const previousPaymentMethods = queryClient.getQueryData(queryKeys.paymentMethods.list);

      // Optimistically update payment method primary status
      queryClient.setQueryData(queryKeys.paymentMethods.list, (old: unknown) => {
        const response = old as { success?: boolean; data?: Array<Record<string, unknown>> };
        if (response?.success && Array.isArray(response.data)) {
          return {
            ...response,
            data: response.data.map(pm => ({
              ...pm,
              isPrimary: pm.id === paymentMethodId,
            })),
          };
        }
        return old;
      });

      return { previousPaymentMethods };
    },
    onError: (error, _variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousPaymentMethods) {
        queryClient.setQueryData(queryKeys.paymentMethods.list, context.previousPaymentMethods);
      }
      logError('Failed to set default payment method', error);
    },
    onSuccess: () => {
      // Invalidate payment methods and subscription queries
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.list });
    },
    retry: (failureCount, error: unknown) => {
      // Don't retry on client errors (4xx)
      const httpError = error as { status?: number };
      if (httpError?.status && httpError.status >= 400 && httpError.status < 500) {
        return false;
      }
      return failureCount < 1;
    },
    throwOnError: false,
  });
}
