import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { logError } from '@/lib/utils/safe-logger';

// Types for subscription management operations
export type ViewUsageRequest = {
  param: {
    id: string;
  };
};

export type DownloadInvoiceRequest = {
  param: {
    id: string;
  };
};

export type ManageSubscriptionRequest = {
  param: {
    id: string;
  };
};

// Mock services until real API endpoints are implemented
async function viewUsageService({ param }: ViewUsageRequest): Promise<{
  subscriptionId: string;
  usage: {
    currentPeriod: {
      start: string;
      end: string;
      usage: number;
      limit: number;
    };
    history: Array<{
      month: string;
      usage: number;
      limit: number;
    }>;
  };
}> {
  // This would call the actual API endpoint for usage data
  await new Promise(resolve => setTimeout(resolve, 600));

  return {
    subscriptionId: param.id,
    usage: {
      currentPeriod: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        usage: 85,
        limit: 100,
      },
      history: [
        { month: 'Dec 2024', usage: 92, limit: 100 },
        { month: 'Nov 2024', usage: 78, limit: 100 },
        { month: 'Oct 2024', usage: 85, limit: 100 },
      ],
    },
  };
}

async function downloadSubscriptionInvoiceService(_request: DownloadInvoiceRequest): Promise<Blob> {
  // This would call the actual API endpoint to get subscription invoice PDF
  await new Promise(resolve => setTimeout(resolve, 900));

  // Create mock PDF blob
  const mockPdf = new Blob(['Mock PDF content for subscription invoice'], { type: 'application/pdf' });
  return mockPdf;
}

/**
 * Hook to view subscription usage details
 * This should navigate to a usage details page/modal
 */
export function useViewUsageMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: viewUsageService,
    onSuccess: (data, variables) => {
      // Cache the usage data
      queryClient.setQueryData(['subscription-usage', variables.param.id], data);

      // Navigate to usage details page
      router.push(`/dashboard/billing/subscriptions/${variables.param.id}/usage`);
    },
    onError: (error, variables) => {
      logError('Failed to fetch subscription usage', { error, subscriptionId: variables.param.id });
    },
    retry: 2,
  });
}

/**
 * Hook to download subscription invoice
 */
export function useDownloadSubscriptionInvoiceMutation() {
  return useMutation({
    mutationFn: downloadSubscriptionInvoiceService,
    onSuccess: (blob, variables) => {
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `subscription-invoice-${variables.param.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error, variables) => {
      logError('Failed to download subscription invoice', { error, subscriptionId: variables.param.id });
    },
    retry: 2,
  });
}

/**
 * Hook to manage subscription (navigate to management page)
 */
export function useManageSubscriptionMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ param }: ManageSubscriptionRequest) => {
      // This is just for navigation, so no actual API call
      return { subscriptionId: param.id };
    },
    onSuccess: (data, variables) => {
      // Navigate to subscription management page
      router.push(`/dashboard/billing/subscriptions/${variables.param.id}/manage`);
    },
    onError: (error, variables) => {
      logError('Failed to navigate to subscription management', { error, subscriptionId: variables.param.id });
    },
  });
}
