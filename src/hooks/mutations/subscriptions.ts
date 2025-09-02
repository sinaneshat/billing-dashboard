import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { logError } from '@/lib/utils/safe-logger';
import type {
  CancelSubscriptionRequest,
  ChangePlanRequest,
  CreateSubscriptionRequest,
  ResubscribeRequest,
} from '@/services/api/subscriptions';
import {
  cancelSubscriptionService,
  changePlanService,
  createSubscriptionService,
  resubscribeService,
} from '@/services/api/subscriptions';

export function useCreateSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: CreateSubscriptionRequest) => {
      const result = await createSubscriptionService(args);
      return result;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.current() });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });

      // Optionally update specific subscription in cache if we have the data
      if (data.success && data.data) {
        // This would require the API to return the created subscription
        // queryClient.setQueryData(queryKeys.subscriptions.detail(data.data.id), data.data);
      }
    },
    onError: (error) => {
      // Enhanced error logging for debugging
      logError('Failed to create subscription', error);
    },
    // Enhanced retry logic for subscription creation
    retry: (failureCount, error: unknown) => {
      const httpError = error as { status?: number };
      // Don't retry if it's a validation error (4xx)
      if (httpError?.status && httpError.status >= 400 && httpError.status < 500) {
        return false;
      }
      // Retry up to 2 times for server errors
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useCancelSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: CancelSubscriptionRequest) => {
      const result = await cancelSubscriptionService(args.param.id, args.json.reason);
      return result;
    },
    onMutate: async (_args) => {
      // Cancel any outgoing refetches for current subscription
      await queryClient.cancelQueries({ queryKey: queryKeys.subscriptions.current() });

      // Snapshot the previous value for rollback
      const previousSubscription = queryClient.getQueryData(queryKeys.subscriptions.current());

      // Optimistically update current subscription status
      queryClient.setQueryData(queryKeys.subscriptions.current(), (old: unknown) => {
        const subscription = old as { success?: boolean; data?: Record<string, unknown> };
        if (subscription?.success && subscription.data) {
          return {
            ...subscription,
            data: {
              ...subscription.data,
              status: 'canceled',
              canceledAt: new Date().toISOString(),
            },
          };
        }
        return old;
      });

      return { previousSubscription };
    },
    onError: (error, _variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousSubscription) {
        queryClient.setQueryData(queryKeys.subscriptions.current(), context.previousSubscription);
      }
      logError('Failed to cancel subscription', error);
    },
    onSuccess: () => {
      // Invalidate queries after successful cancellation
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.current() });
    },
    retry: 1,
  });
}

export function useResubscribeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: ResubscribeRequest) => {
      const result = await resubscribeService(args.param.id, args.json.callbackUrl);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.current() });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
    onError: (error) => {
      logError('Failed to resubscribe', error);
    },
    retry: 1,
  });
}

export function useChangePlanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: ChangePlanRequest) => {
      const result = await changePlanService(args);
      return result;
    },
    onMutate: async (args) => {
      // Cancel any outgoing refetches for the specific subscription
      await queryClient.cancelQueries({
        queryKey: queryKeys.subscriptions.detail(args.param.id),
      });

      // Snapshot the previous subscription data
      const previousSubscription = queryClient.getQueryData(
        queryKeys.subscriptions.detail(args.param.id),
      );

      return { previousSubscription };
    },
    onError: (error, _variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousSubscription) {
        queryClient.setQueryData(
          queryKeys.subscriptions.detail(_variables.param.id),
          context.previousSubscription,
        );
      }
      logError('Failed to change subscription plan', error);
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.current() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.subscriptions.detail(variables.param.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
    retry: 1,
  });
}
