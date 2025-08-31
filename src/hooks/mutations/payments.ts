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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.history() });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.current() });
    },
  });
}
