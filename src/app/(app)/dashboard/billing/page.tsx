import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { CustomerBillingOverviewScreen } from '@/containers/screens/dashboard/billing';
import { getQueryClient } from '@/lib/data/query-client';
import { queryKeys } from '@/lib/data/query-keys';
import {
  getPaymentMethodsService,
  getPaymentsService,
  getSubscriptionsService,
} from '@/services/api';

/**
 * Enhanced Billing Overview Page - Server Component
 * Following TanStack Query official SSR patterns from Context7 docs
 *
 * Features:
 * - Server-side prefetching for instant loading
 * - Real-time payment history with transaction details
 * - Enhanced subscription management with upcoming bills
 * - Improved payment method handling with direct debit contracts
 * - Modern shadcn/ui patterns with better UX
 */
export default async function BillingOverviewPage() {
  const queryClient = getQueryClient();

  // Prefetch comprehensive billing data in parallel on server
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.list,
      queryFn: getSubscriptionsService,
      staleTime: 2 * 60 * 1000, // 2 minutes for subscription data
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.paymentMethods.list,
      queryFn: getPaymentMethodsService,
      staleTime: 5 * 60 * 1000, // 5 minutes for payment methods
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.payments.list,
      queryFn: getPaymentsService,
      staleTime: 60 * 1000, // 1 minute for payment history
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CustomerBillingOverviewScreen />
    </HydrationBoundary>
  );
}
