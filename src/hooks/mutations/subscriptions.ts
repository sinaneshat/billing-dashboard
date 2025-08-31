import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import type {
  CancelSubscriptionRequest,
  CreateSubscriptionRequest,
  ResubscribeRequest,
} from '@/services/api/subscriptions';
import {
  cancelSubscriptionService,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.current() });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });
}

export function useCancelSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: CancelSubscriptionRequest) => {
      const result = await cancelSubscriptionService(args.param.id, args.json.reason);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.current() });
    },
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
  });
}
