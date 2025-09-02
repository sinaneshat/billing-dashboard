'use client';

import { SubscriptionPlansScreen } from '@/containers/screens/dashboard/billing';
import { usePrefetchProducts, usePrefetchSubscriptions } from '@/lib/data/prefetch-utils';

export default function PlansPage() {
  // Official TanStack Query prefetching - products for plans + current subscriptions
  usePrefetchProducts();
  usePrefetchSubscriptions();

  return <SubscriptionPlansScreen />;
}
