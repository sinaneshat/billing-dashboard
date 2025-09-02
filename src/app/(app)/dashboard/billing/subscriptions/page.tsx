'use client';

import { SubscriptionManagementScreen } from '@/containers/screens/dashboard/billing';
import { usePrefetchPaymentMethods, usePrefetchSubscriptions } from '@/lib/data/prefetch-utils';

export default function SubscriptionsPage() {
  // Official TanStack Query prefetching - subscription management focus
  usePrefetchSubscriptions();
  usePrefetchPaymentMethods(); // Needed for subscription payment updates

  return <SubscriptionManagementScreen />;
}
