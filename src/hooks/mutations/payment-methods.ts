import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { logError } from '@/lib/utils/safe-logger';
import { isZarinPalError, parseZarinPalError } from '@/lib/utils/zarinpal-errors';
import type {
  CreatePaymentMethodRequest,
  DeletePaymentMethodRequest,
  InitiateDirectDebitContractRequest,
  SetDefaultPaymentMethodRequest,
  VerifyDirectDebitContractRequest,
} from '@/services/api/payment-methods';
import {
  createPaymentMethodService,
  deletePaymentMethodService,
  initiateDirectDebitContractService,
  setDefaultPaymentMethodService,
  verifyDirectDebitContractService,
} from '@/services/api/payment-methods';

// Type interface for errors with ZarinPal error information attached
type ErrorWithZarinPalInfo = {
  zarinPalError?: ReturnType<typeof parseZarinPalError>;
  isZarinPalError?: boolean;
  isAuthError?: boolean;
} & Error;

export function useCreatePaymentMethodMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: CreatePaymentMethodRequest) => {
      const result = await createPaymentMethodService(args);
      return result;
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeys.paymentMethods.all });

      // Snapshot the previous value
      const previousPaymentMethods = queryClient.getQueryData(queryKeys.paymentMethods.list());

      // Return a context object with the snapshotted value
      return { previousPaymentMethods, variables };
    },
    onSuccess: (data, _variables, _context) => {
      // Invalidate relevant queries for fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list() });

      // Update specific payment method in cache if we have the data
      if (data.success && data.data) {
        queryClient.setQueryData(queryKeys.paymentMethods.list(), (old: unknown) => {
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
    onError: (error, variables, context) => {
      logError('Failed to create payment method', error);
      // If we had a previous value, revert to it on error
      if (context?.previousPaymentMethods) {
        queryClient.setQueryData(queryKeys.paymentMethods.list(), context.previousPaymentMethods);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure cache consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
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
      await queryClient.cancelQueries({ queryKey: queryKeys.paymentMethods.all });

      // Snapshot the previous value for rollback
      const previousPaymentMethods = queryClient.getQueryData(queryKeys.paymentMethods.list());

      // Optimistically update payment methods list
      queryClient.setQueryData(queryKeys.paymentMethods.list(), (old: unknown) => {
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
        queryClient.setQueryData(queryKeys.paymentMethods.list(), context.previousPaymentMethods);
      }
    },
    onSuccess: () => {
      // Invalidate queries after successful deletion
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list() });
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
      await queryClient.cancelQueries({ queryKey: queryKeys.paymentMethods.all });

      // Snapshot the previous value for rollback
      const previousPaymentMethods = queryClient.getQueryData(queryKeys.paymentMethods.list());

      // Optimistically update payment methods list
      queryClient.setQueryData(queryKeys.paymentMethods.list(), (old: unknown) => {
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
        queryClient.setQueryData(queryKeys.paymentMethods.list(), context.previousPaymentMethods);
      }
    },
    onSuccess: () => {
      // Invalidate queries after successful update
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list() });
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
      // Parse error message for better user experience
      let errorMessage = 'Failed to setup direct debit contract. Please try again.';

      if (error instanceof Error) {
        // Check if it's a ZarinPal specific error
        if (error.message.includes('Authentication required')) {
          errorMessage = 'Please sign in again to continue with the setup.';
        } else if (error.message.includes('Invalid merchant') || error.message.includes('MERCHANT')) {
          errorMessage = 'Payment service configuration issue. Please contact support.';
        } else if (error.message.includes('Invalid mobile') || error.message.includes('MOBILE')) {
          errorMessage = 'Please check your mobile number format and try again.';
        } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
          errorMessage = 'Server error occurred. Please try again in a few moments.';
        } else if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Connection error. Please check your internet and try again.';
        } else if (error.message.includes('Invalid ZarinPal merchant ID')) {
          errorMessage = 'Payment service temporarily unavailable. Please try again later.';
        }
      }

      // Show toast notification for all errors
      import('@/lib/utils/toast-notifications').then(({ showErrorToast }) => {
        showErrorToast(errorMessage, {
          component: 'direct-debit-setup',
          actionType: 'contract-initiation',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

      // Parse ZarinPal error for structured error information (keep for component access)
      if (isZarinPalError(error)) {
        const parsedError = parseZarinPalError(error);

        // Attach parsed error information to the error object for component access
        if (error instanceof Error) {
          (error as ErrorWithZarinPalInfo).zarinPalError = parsedError;
          (error as ErrorWithZarinPalInfo).isZarinPalError = true;
        }
      }

      // Handle authentication errors
      if (error instanceof Error && error.message.includes('Authentication required')) {
        (error as ErrorWithZarinPalInfo).isAuthError = true;
      }
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
      // Invalidate payment methods queries to refetch latest data
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list() });

      // Optionally add the new payment method to cache if contract was verified
      if (data.success && data.data?.paymentMethodId && data.data?.contractVerified) {
        queryClient.setQueryData(queryKeys.paymentMethods.list(), (old: unknown) => {
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
      // Parse ZarinPal error for structured error information
      if (isZarinPalError(error)) {
        const parsedError = parseZarinPalError(error);

        // Attach parsed error information to the error object for component access
        if (error instanceof Error) {
          (error as ErrorWithZarinPalInfo).zarinPalError = parsedError;
          (error as ErrorWithZarinPalInfo).isZarinPalError = true;
        }
      }
    },
    retry: false, // Contract verification should not auto-retry - it's a one-time callback
  });
}
