import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { PaymentMethodsScreen } from '@/containers/screens/dashboard/billing';
import { getQueryClient } from '@/lib/data/query-client';
import { queryKeys } from '@/lib/data/query-keys';
import {
  getPaymentMethodsService,
  getSubscriptionsService,
} from '@/services/api';

/**
 * Payment Methods Page - Server Component
 * Following TanStack Query official SSR patterns from Context7 docs
 * Prefetches payment methods and subscriptions for instant loading
 */
export default async function PaymentMethodsPage() {
  const queryClient = getQueryClient();

  // Prefetch payment methods and related subscription data in parallel
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.paymentMethods.list,
      queryFn: getPaymentMethodsService,
      staleTime: 5 * 60 * 1000, // 5 minutes - payment methods don't change often
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.list,
      queryFn: getSubscriptionsService,
      staleTime: 2 * 60 * 1000, // 2 minutes for subscription data
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PaymentMethodsScreen />
    </HydrationBoundary>
  );
}
