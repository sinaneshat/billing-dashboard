'use client';

import { SubscriptionBillingScreen } from '@/containers/screens/dashboard/billing';
import { usePrefetchPaymentMethods, usePrefetchSubscriptions } from '@/lib/data/prefetch-utils';

export default function SubscriptionBillingPage() {
  // Official TanStack Query prefetching - payment history focus
  usePrefetchSubscriptions();
  usePrefetchPaymentMethods();

  return <SubscriptionBillingScreen />;
}
