import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { SubscriptionPlansScreen } from '@/containers/screens/dashboard/billing';
import { getQueryClient } from '@/lib/data/query-client';
import { queryKeys } from '@/lib/data/query-keys';
import {
  getProductsService,
  getSubscriptionsService,
} from '@/services/api';

type PlansPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function PlansPage(props: PlansPageProps) {
  const searchParams = await props.searchParams;
  const queryClient = getQueryClient();

  // Extract essential parameters only - no referrer
  const priceId = typeof searchParams.price === 'string' ? searchParams.price : undefined;
  const billing = typeof searchParams.billing === 'string' ? searchParams.billing : undefined;
  const step = typeof searchParams.step === 'string' ? searchParams.step : undefined;

  // Prefetch data
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.list,
      queryFn: getProductsService,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.list,
      queryFn: getSubscriptionsService,
    }),
  ]);

  // Clean SSO flow data with only essential parameters
  const ssoFlowData = {
    priceId,
    billing,
    step: step === '2' ? 'payment' : undefined, // Only set step if explicit
  };

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SubscriptionPlansScreen ssoFlowData={ssoFlowData} />
    </HydrationBoundary>
  );
}
