import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { logError } from '@/lib/utils/safe-logger';

// Define payment item type matching the component structure
type PaymentItem = {
  id: string;
  productName: string;
  amount: number;
  status: string;
  paymentMethod: string;
  paidAt: string | null;
  createdAt: string;
  hasReceipt: boolean;
  failureReason?: string | null;
  zarinpalRefId?: string | null;
};

// Types for payment operations
export type RetryPaymentRequest = {
  param: {
    id: string;
  };
  json?: {
    paymentMethodId?: string;
  };
};

export type DownloadReceiptRequest = {
  param: {
    id: string;
  };
};

export type ViewPaymentRequest = {
  param: {
    id: string;
  };
};

// Mock services until real API endpoints are implemented
async function retryPaymentService({ param: _param }: RetryPaymentRequest): Promise<{ success: boolean; message?: string }> {
  // This would call the actual API endpoint
  // For now, simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate occasional failures for realistic behavior
  if (Math.random() > 0.8) {
    throw new Error('Payment retry failed. Please try again.');
  }

  return {
    success: true,
    message: 'Payment retry initiated successfully',
  };
}

async function downloadReceiptService({ param: _param }: DownloadReceiptRequest): Promise<Blob> {
  // This would call the actual API endpoint to get receipt PDF
  // For now, simulate PDF download
  await new Promise(resolve => setTimeout(resolve, 800));

  // Create mock PDF blob
  const mockPdf = new Blob(['Mock PDF content for receipt'], { type: 'application/pdf' });
  return mockPdf;
}

async function viewPaymentService({ param: _param }: ViewPaymentRequest): Promise<PaymentItem | null> {
  // This would call the actual API endpoint to get payment details
  await new Promise(resolve => setTimeout(resolve, 500));

  // Return mock payment details - this should come from actual API
  return {
    id: _param.id,
    productName: 'Premium Plan',
    amount: 299000,
    status: 'completed',
    paymentMethod: 'direct-debit-contract',
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    hasReceipt: true,
    zarinpalRefId: '123456789',
  };
}

/**
 * Hook to retry a failed payment
 */
export function useRetryPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: retryPaymentService,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.payments.list });

      // Snapshot the previous value
      const previousPayments = queryClient.getQueryData(queryKeys.payments.list);

      // Optimistically update to show "processing" status
      queryClient.setQueryData(queryKeys.payments.list, (old: unknown) => {
        if (old && typeof old === 'object' && 'success' in old && old.success && 'data' in old && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.map((payment: PaymentItem) =>
              payment.id === variables.param.id
                ? { ...payment, status: 'processing' }
                : payment,
            ),
          };
        }
        return old;
      });

      return { previousPayments };
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousPayments) {
        queryClient.setQueryData(queryKeys.payments.list, context.previousPayments);
      }
      logError('Failed to retry payment', { error, paymentId: variables.param.id });
    },
    onSuccess: (_data, _variables) => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });

      // Also invalidate subscriptions as payment retry might affect subscription status
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.current });
    },
    retry: 1,
  });
}

/**
 * Hook to download payment receipt
 */
export function useDownloadReceiptMutation() {
  return useMutation({
    mutationFn: downloadReceiptService,
    onSuccess: (_blob, variables) => {
      // Create download link and trigger download
      const url = window.URL.createObjectURL(_blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${variables.param.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error, variables) => {
      logError('Failed to download receipt', { error, paymentId: variables.param.id });
    },
    retry: 2,
  });
}

/**
 * Hook to download payment invoice
 */
export function useDownloadInvoiceMutation() {
  return useMutation({
    mutationFn: async ({ param: _param }: DownloadReceiptRequest): Promise<Blob> => {
      // Similar to receipt but for invoice
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockPdf = new Blob(['Mock PDF content for invoice'], { type: 'application/pdf' });
      return mockPdf;
    },
    onSuccess: (blob, variables) => {
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${variables.param.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error, variables) => {
      logError('Failed to download invoice', { error, paymentId: variables.param.id });
    },
    retry: 2,
  });
}

/**
 * Hook to view payment details (for navigation)
 */
export function useViewPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: viewPaymentService,
    onSuccess: (data, variables) => {
      // Cache the payment details for future use
      if (data) {
        queryClient.setQueryData(['payment', variables.param.id], data);
      }
    },
    onError: (error, variables) => {
      logError('Failed to fetch payment details', { error, paymentId: variables.param.id });
    },
    retry: 2,
  });
}
