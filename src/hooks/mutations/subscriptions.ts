import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { logError } from '@/lib/utils/safe-logger';
import {
  cancelSubscriptionService,
  createSubscriptionService,
  switchSubscriptionService,
} from '@/services/api';

export function useCreateSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSubscriptionService,
    onSuccess: () => {
      // Invalidate subscription-related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.list });
    },
    onError: (error) => {
      logError('Failed to create subscription', error);
    },
    retry: (failureCount, error: unknown) => {
      // Don't retry on client errors (4xx)
      const httpError = error as { status?: number };
      if (httpError?.status && httpError.status >= 400 && httpError.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    throwOnError: false,
  });
}

export function useCancelSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelSubscriptionService,
    onMutate: async (args) => {
      // Cancel outgoing refetches and snapshot previous value
      await queryClient.cancelQueries({ queryKey: queryKeys.subscriptions.list });
      const previousSubscriptions = queryClient.getQueryData(queryKeys.subscriptions.list);

      // Optimistically update subscription status in the list
      queryClient.setQueryData(queryKeys.subscriptions.list, (old: unknown) => {
        const response = old as { success?: boolean; data?: Array<Record<string, unknown>> };
        if (response?.success && Array.isArray(response.data)) {
          return {
            ...response,
            data: response.data.map(sub =>
              sub.id === args.param.id
                ? { ...sub, status: 'canceled', canceledAt: new Date().toISOString() }
                : sub,
            ),
          };
        }
        return old;
      });

      return { previousSubscriptions };
    },
    onError: (error, _variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousSubscriptions) {
        queryClient.setQueryData(queryKeys.subscriptions.list, context.previousSubscriptions);
      }
      logError('Failed to cancel subscription', error);
    },
    onSuccess: () => {
      // Invalidate subscription queries to refetch fresh data
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

export function useSwitchSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: switchSubscriptionService,
    onMutate: async (args) => {
      // Cancel outgoing refetches and snapshot previous value
      await queryClient.cancelQueries({ queryKey: queryKeys.subscriptions.list });
      const previousSubscriptions = queryClient.getQueryData(queryKeys.subscriptions.list);

      // Optimistically update subscription to reflect the switch
      queryClient.setQueryData(queryKeys.subscriptions.list, (old: unknown) => {
        const response = old as { success?: boolean; data?: Array<Record<string, unknown>> };
        if (response?.success && Array.isArray(response.data)) {
          return {
            ...response,
            data: response.data.map((sub) => {
              // Mark current active subscription as switching
              if (sub.status === 'active') {
                const switchingToProductId = ('json' in args && typeof args.json === 'object' && args.json !== null && 'newProductId' in args.json)
                  ? args.json.newProductId as string
                  : undefined;
                return { ...sub, status: 'switching', switchingToProductId };
              }
              return sub;
            }),
          };
        }
        return old;
      });

      return { previousSubscriptions };
    },
    onError: (error, _variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousSubscriptions) {
        queryClient.setQueryData(queryKeys.subscriptions.list, context.previousSubscriptions);
      }
      logError('Failed to switch subscription', error);
    },
    onSuccess: () => {
      // Invalidate subscription-related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.list });
    },
    retry: (failureCount, error: unknown) => {
      // Don't retry on client errors (4xx) - especially important for subscription switches
      const httpError = error as { status?: number };
      if (httpError?.status && httpError.status >= 400 && httpError.status < 500) {
        return false;
      }
      return failureCount < 2; // Allow slightly more retries for server errors
    },
    throwOnError: false,
  });
}
