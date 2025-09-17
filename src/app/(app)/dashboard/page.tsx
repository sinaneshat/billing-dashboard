import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { DashboardOverviewScreen } from '@/containers/screens/dashboard';
import { getQueryClient } from '@/lib/data/query-client';
import { queryKeys } from '@/lib/data/query-keys';
import {
  getPaymentMethodsService,
  getPaymentsService,
  getSubscriptionsService,
} from '@/services/api';

/**
 * Dashboard Overview Page - Server Component
 * Following TanStack Query official SSR patterns from Context7 docs
 * Prefetches billing data on server and hydrates for instant client loading
 */
export default async function DashboardOverviewPage() {
  const queryClient = getQueryClient();

  // Prefetch essential billing data for immediate dashboard display
  // Products are handled via ISR on plans page since they change infrequently
  // Using Promise.allSettled to avoid failing if one query fails
  // CRITICAL: Key matching options for proper hydration (prefetchQuery has limited options)
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.list,
      queryFn: getSubscriptionsService,
      staleTime: 2 * 60 * 1000, // 2 minutes - must match client hook
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.paymentMethods.list,
      queryFn: getPaymentMethodsService,
      staleTime: 5 * 60 * 1000, // 5 minutes - must match client hook
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.payments.list,
      queryFn: getPaymentsService,
      staleTime: 60 * 1000, // 1 minute - must match client hook
    }),
  ]);

  return (
    // HydrationBoundary passes prefetched server data to client components
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardOverviewScreen />
    </HydrationBoundary>
  );
}
