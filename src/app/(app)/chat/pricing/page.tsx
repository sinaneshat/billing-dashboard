import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { PricingScreen } from '@/containers/screens/chat/billing';
import { getQueryClient } from '@/lib/data/query-client';
import { queryKeys } from '@/lib/data/query-keys';
import { getProductsService, getSubscriptionsService } from '@/services/api';

/**
 * Pricing Page - SSR (Server-Side Rendering)
 *
 * Unified pricing and subscription management page
 * Shows pricing plans with subscription-aware buttons:
 * - "Manage Billing" for users with active subscriptions
 * - "Subscribe" for users without subscriptions
 *
 * Includes annual vs monthly plan toggle
 * User-specific data requires dynamic rendering (cannot use ISR)
 */

// Force dynamic rendering for user-specific subscription data
export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const queryClient = getQueryClient();

  // Prefetch both products and user subscriptions on server
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.list(),
      queryFn: getProductsService,
      staleTime: 3600 * 1000, // 1 hour
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.list(),
      queryFn: getSubscriptionsService,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PricingScreen />
    </HydrationBoundary>
  );
}
