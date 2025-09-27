import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { PaymentHistoryScreen } from '@/containers/screens/dashboard/billing';
import { getQueryClient } from '@/lib/data/query-client';
import { queryKeys } from '@/lib/data/query-keys';
import {
  getPaymentMethodsService,
  getPaymentsService,
  getProductsService,
  getSubscriptionsService,
} from '@/services/api';

/**
 * Payment History Page - Server Component
 * Following TanStack Query official SSR patterns
 * Prefetches actual payment transaction history for instant loading
 * Shows payment transactions, NOT payment method contracts
 */
export default async function PaymentHistoryPage() {
  const queryClient = getQueryClient();

  // Prefetch payment history with related billing data in parallel
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.payments.list,
      queryFn: getPaymentsService,
      staleTime: 60 * 1000, // 1 minute for payment history - can change frequently
    }),
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
      queryKey: queryKeys.products.list,
      queryFn: getProductsService,
      staleTime: 10 * 60 * 1000, // 10 minutes for products - rarely changes
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PaymentHistoryScreen />
    </HydrationBoundary>
  );
}
