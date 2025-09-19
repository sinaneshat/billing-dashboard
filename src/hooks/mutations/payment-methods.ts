import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { logError } from '@/lib/utils/safe-logger';
import type {
  CancelDirectDebitContractRequest,
  CreatePaymentMethodRequest,
  DeletePaymentMethodRequest,
  ExecuteDirectDebitPaymentRequest,
  GetBankListRequest,
  InitiateDirectDebitContractRequest,
  SetDefaultPaymentMethodRequest,
  VerifyDirectDebitContractRequest,
} from '@/services/api/payment-methods';
import {
  cancelDirectDebitContractService,
  createPaymentMethodService,
  deletePaymentMethodService,
  executeDirectDebitPaymentService,
  getBankListService,
  initiateDirectDebitContractService,
  setDefaultPaymentMethodService,
  verifyDirectDebitContractService,
} from '@/services/api/payment-methods';

export function useCreatePaymentMethodMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: CreatePaymentMethodRequest) => {
      const result = await createPaymentMethodService(args);
      return result;
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeys.paymentMethods.list });

      // Snapshot the previous value
      const previousPaymentMethods = queryClient.getQueryData(queryKeys.paymentMethods.list);

      // Return a context object with the snapshotted value
      return { previousPaymentMethods, variables };
    },
    onSuccess: (data, _variables, _context) => {
      // Only invalidate the specific query being used to avoid redundant requests
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list });

      // Update specific payment method in cache if we have the data
      if (data.success && data.data) {
        queryClient.setQueryData(queryKeys.paymentMethods.list, (old: unknown) => {
          const oldData = old as { success?: boolean; data?: unknown[] };
          if (oldData?.success && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: [data.data, ...oldData.data],
            };
          }
          return old;
        });
      }
    },
    onError: (error, _variables, context) => {
      logError('Failed to create payment method', error);
      // If we had a previous value, revert to it on error
      if (context?.previousPaymentMethods) {
        queryClient.setQueryData(queryKeys.paymentMethods.list, context.previousPaymentMethods);
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on authentication errors or client errors
      if (error instanceof Error && error.message.includes('Authentication')) {
        return false;
      }
      const errorStatus = (error as { status?: number })?.status;
      if (errorStatus && errorStatus >= 400 && errorStatus < 500) {
        return false;
      }
      return failureCount < 2; // Retry once for server errors
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useDeletePaymentMethodMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: DeletePaymentMethodRequest) => {
      const result = await deletePaymentMethodService(args.param.id);
      return result;
    },
    onMutate: async (args) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.paymentMethods.list });

      // Snapshot the previous value for rollback
      const previousPaymentMethods = queryClient.getQueryData(queryKeys.paymentMethods.list);

      // Optimistically update payment methods list
      queryClient.setQueryData(queryKeys.paymentMethods.list, (old: unknown) => {
        const oldData = old as { success?: boolean; data?: Array<{ id: string }> };
        if (oldData?.success && Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.filter(pm => pm.id !== args.param.id),
          };
        }
        return old;
      });

      return { previousPaymentMethods };
    },
    onError: (error, _variables, context) => {
      logError('Failed to delete payment method', error);
      // Rollback optimistic update on error
      if (context?.previousPaymentMethods) {
        queryClient.setQueryData(queryKeys.paymentMethods.list, context.previousPaymentMethods);
      }
    },
    onSuccess: () => {
      // Only invalidate the specific query being used to avoid redundant requests
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list });
    },
    retry: 1,
  });
}

export function useSetDefaultPaymentMethodMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: SetDefaultPaymentMethodRequest) => {
      const result = await setDefaultPaymentMethodService(args.param.id);
      return result;
    },
    onMutate: async (args) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.paymentMethods.list });

      // Snapshot the previous value for rollback
      const previousPaymentMethods = queryClient.getQueryData(queryKeys.paymentMethods.list);

      // Optimistically update payment methods list
      queryClient.setQueryData(queryKeys.paymentMethods.list, (old: unknown) => {
        const oldData = old as { success?: boolean; data?: Array<{ id: string; isPrimary: boolean }> };
        if (oldData?.success && Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.map(pm => ({
              ...pm,
              isPrimary: pm.id === args.param.id,
            })),
          };
        }
        return old;
      });

      return { previousPaymentMethods };
    },
    onError: (error, _variables, context) => {
      logError('Failed to set default payment method', error);
      // Rollback optimistic update on error
      if (context?.previousPaymentMethods) {
        queryClient.setQueryData(queryKeys.paymentMethods.list, context.previousPaymentMethods);
      }
    },
    onSuccess: () => {
      // Only invalidate the specific query being used to avoid redundant requests
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list });
    },
    retry: 1,
  });
}

// ============================================================================
//  Direct Debit Contract Mutation Hooks (NEW - ZarinPal Payman API)
// ============================================================================

/**
 * Hook to initiate direct debit contract setup (Step 1)
 * Returns available banks and contract signing URL template
 */
export function useInitiateDirectDebitContractMutation() {
  return useMutation({
    mutationFn: async (args: InitiateDirectDebitContractRequest) => {
      const result = await initiateDirectDebitContractService(args);
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
      if (data.success && data.data?.paymentMethodId && data.data?.contractVerified) {
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
 * Hook to get available banks for direct debit contract signing
 * Used for bank selection during contract setup
 */
export function useGetBankListMutation() {
  return useMutation({
    mutationFn: async (args?: GetBankListRequest) => {
      const result = await getBankListService(args);
      return result;
    },
    onError: (error) => {
      logError('Failed to fetch bank list', error);

      // Show user-friendly error message
      let errorMessage = 'Failed to load banks. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Connection error. Please check your internet and try again.';
        } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
          errorMessage = 'Server error occurred. Please try again in a few moments.';
        }
      }

      // Log error for debugging (toast will be handled by component layer)
      logError('Bank list fetch failed', { errorMessage, component: 'bank-list' });
    },
    retry: 1,
  });
}

/**
 * Hook to execute direct debit payment for subscription billing
 * Handles currency conversion automatically from USD to IRR
 */
export function useExecuteDirectDebitPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: ExecuteDirectDebitPaymentRequest) => {
      const result = await executeDirectDebitPaymentService(args);
      return result;
    },
    onSuccess: () => {
      // Only invalidate the specific queries being used to avoid redundant requests
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list });
    },
    onError: (error) => {
      logError('Failed to execute direct debit payment', error);
    },
    retry: false, // Payment operations should not auto-retry to avoid duplicate charges
  });
}

/**
 * Hook to cancel direct debit contract
 * Legally required - users must be able to cancel contracts
 */
export function useCancelDirectDebitContractMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: CancelDirectDebitContractRequest) => {
      const result = await cancelDirectDebitContractService(args.param.contractId);
      return result;
    },
    onMutate: async (args) => {
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
              isActive: pm.id === args.param.contractId ? false : pm.isActive,
              contractStatus: pm.id === args.param.contractId ? 'cancelled_by_user' : pm.contractStatus,
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
