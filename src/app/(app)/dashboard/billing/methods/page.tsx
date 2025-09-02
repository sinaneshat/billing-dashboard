'use client';

import { PaymentMethodsScreen } from '@/containers/screens/dashboard/billing';
import { usePrefetchPaymentMethods, usePrefetchSubscriptions } from '@/lib/data/prefetch-utils';

export default function PaymentMethodsPage() {
  // Official TanStack Query prefetching pattern - simple and direct
  usePrefetchPaymentMethods();
  usePrefetchSubscriptions(); // Payment methods are often used with subscriptions

  return <PaymentMethodsScreen />;
}
