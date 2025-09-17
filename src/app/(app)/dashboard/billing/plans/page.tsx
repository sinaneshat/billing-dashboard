import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { SubscriptionPlansScreen } from '@/containers/screens/dashboard/billing';
import { getQueryClient } from '@/lib/data/query-client';
import { queryKeys } from '@/lib/data/query-keys';
import {
  getProductsService,
  getSubscriptionsService,
} from '@/services/api';

// ISR Configuration - Revalidate plans every 2 hours since they change infrequently
export const revalidate = 7200; // 2 hours in seconds

type PlansPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PlansPage(props: PlansPageProps) {
  const searchParams = await props.searchParams;
  const queryClient = getQueryClient();

  // Extract essential parameters only - no referrer
  const priceId = typeof searchParams.priceId === 'string'
    ? searchParams.priceId
    : typeof searchParams.price === 'string'
      ? searchParams.price
      : undefined;
  const productId = typeof searchParams.productId === 'string'
    ? searchParams.productId
    : typeof searchParams.product === 'string'
      ? searchParams.product
      : undefined;
  const step = typeof searchParams.step === 'string' ? searchParams.step : undefined;

  // ISR Strategy: Products are cached for 2 hours via ISR
  // Prefetch data with extended stale times to align with ISR strategy
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.list,
      queryFn: getProductsService,
      staleTime: 2 * 60 * 60 * 1000, // 2 hours to match ISR revalidation
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.list,
      queryFn: getSubscriptionsService,
      staleTime: 2 * 60 * 1000, // 2 minutes for subscription data
    }),
  ]);

  // Clean SSO flow data with only essential parameters
  const ssoFlowData = {
    priceId,
    productId,
    step: step === '2' ? 'payment' : undefined, // Only set step if explicit
  };

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SubscriptionPlansScreen ssoFlowData={ssoFlowData} />
    </HydrationBoundary>
  );
}
