import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import type {
  CreatePaymentMethodRequest,
  DeletePaymentMethodRequest,
  SetDefaultPaymentMethodRequest,
} from '@/services/api/payment-methods';
import {
  createPaymentMethodService,
  deletePaymentMethodService,
  enableDirectDebitService,
  initiateCardAdditionService,
  setDefaultPaymentMethodService,
  verifyCardAdditionService,
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
//  New Card Addition Mutation Hooks
// ============================================================================

/**
 * Hook to initiate card addition flow
 * Returns verification URL to redirect user to ZarinPal
 */
export function useInitiateCardAdditionMutation() {
  return useMutation({
    mutationFn: async ({ callbackUrl, metadata }: { callbackUrl: string; metadata?: Record<string, unknown> }) => {
      const result = await initiateCardAdditionService(callbackUrl, metadata);
      return result;
    },
    onError: (error) => {
      console.error('Failed to initiate card addition:', error);
    },
    retry: false, // Card addition should not auto-retry - requires user action
  });
}

/**
 * Hook to verify card addition after user returns from ZarinPal
 * Creates payment method record if verification successful
 */
export function useVerifyCardAdditionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ authority, status }: { authority: string; status?: string }) => {
      const result = await verifyCardAdditionService(authority, status);
      return result;
    },
    onSuccess: (data) => {
      // Invalidate payment methods queries to refetch latest data
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list() });

      // Optionally add the new payment method to cache if verification was successful
      if (data.success && data.data?.paymentMethod && data.data?.verified) {
        queryClient.setQueryData(queryKeys.paymentMethods.list(), (old: unknown) => {
          const oldData = old as { success?: boolean; data?: unknown[] };
          if (oldData?.success && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: [data.data!.paymentMethod, ...oldData.data],
            };
          }
          return old;
        });
      }
    },
    onError: (error) => {
      console.error('Failed to verify card addition:', error);
    },
    retry: false, // Verification should not auto-retry - it's a one-time callback
  });
}

/**
 * Hook to enable direct debit for a payment method
 * Optionally links to a specific subscription
 */
export function useEnableDirectDebitMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentMethodId, subscriptionId }: { paymentMethodId: string; subscriptionId?: string }) => {
      const result = await enableDirectDebitService(paymentMethodId, subscriptionId);
      return result;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.list() });

      // If linked to a subscription, invalidate subscription queries too
      if (variables.subscriptionId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.list() });
        queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.detail(variables.subscriptionId) });
      }
    },
    onError: (error) => {
      console.error('Failed to enable direct debit:', error);
    },
    retry: 1,
  });
}
