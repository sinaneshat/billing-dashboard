import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import type { VerifyPaymentRequest } from '@/services/api/payments';
import { verifyPaymentService } from '@/services/api/payments';

export function useVerifyPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: VerifyPaymentRequest) => {
      const result = await verifyPaymentService(args);
      return result;
    },
    onSuccess: (data, variables) => {
      // Invalidate payment-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.history() });

      // If payment verification affects subscriptions, invalidate subscription queries
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.current() });

      // Optionally update specific payment in cache if successful
      if (data.success && data.data && variables.json?.authority) {
        // Could update specific payment status in cache if we had payment ID
        // queryClient.setQueryData(queryKeys.payments.detail(paymentId), data.data);
      }
    },
    onError: (error, variables) => {
      console.error('Payment verification failed:', {
        error,
        authority: variables.json?.authority,
      });
    },
    // Payment verification should be retried carefully
    retry: (failureCount, error: unknown) => {
      const httpError = error as { status?: number };
      // Don't retry if payment is already processed (409) or validation error (4xx)
      if (httpError?.status === 409 || (httpError?.status && httpError.status >= 400 && httpError.status < 500)) {
        return false;
      }
      // Retry once for server errors
      return failureCount < 1;
    },
    retryDelay: 2000, // 2 seconds delay for payment verification
  });
}
