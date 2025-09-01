import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
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

export function useCreatePaymentMethodMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: CreatePaymentMethodRequest) => {
      const result = await createPaymentMethodService(args);
      return result;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list() });

      // Optionally update specific payment method in cache if we have the data
      if (data.success && data.data) {
        // Add the new payment method to the cache
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
    onError: (error) => {
      console.error('Failed to create payment method:', error);
    },
    retry: 1,
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
      // Rollback optimistic update on error
      if (context?.previousPaymentMethods) {
        queryClient.setQueryData(queryKeys.paymentMethods.list(), context.previousPaymentMethods);
      }
      console.error('Failed to delete payment method:', error);
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
      // Rollback optimistic update on error
      if (context?.previousPaymentMethods) {
        queryClient.setQueryData(queryKeys.paymentMethods.list(), context.previousPaymentMethods);
      }
      console.error('Failed to set default payment method:', error);
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
    onError: (error) => {
      console.error('Failed to initiate direct debit contract:', error);
    },
    retry: false, // Contract setup should not auto-retry - requires user action
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
      console.error('Failed to verify direct debit contract:', error);
    },
    retry: false, // Contract verification should not auto-retry - it's a one-time callback
  });
}
