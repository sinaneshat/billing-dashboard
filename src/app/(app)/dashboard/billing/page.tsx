'use client';

import { SubscriptionBillingScreen } from '@/containers/screens/dashboard/billing';
import { usePrefetchPaymentMethods, usePrefetchSubscriptions } from '@/lib/data/prefetch-utils';

export default function BillingOverviewPage() {
  // Official TanStack Query prefetching - comprehensive billing data for overview
  usePrefetchSubscriptions();
  usePrefetchPaymentMethods();

  return <SubscriptionBillingScreen />;
}
