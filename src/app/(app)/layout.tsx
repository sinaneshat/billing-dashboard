import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type React from 'react';

import { requireAuth } from '@/app/auth/actions';
import { getQueryClient } from '@/lib/data/query-client';
import { queryKeys } from '@/lib/data/query-keys';
import {
  getPaymentMethodsService,
  getProductsService,
  getSubscriptionsService,
} from '@/services/api';
import { getPaymentsService } from '@/services/api/payments';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Simplified: Single function call handles auth check and redirect
  await requireAuth();

  // Create query client with streaming SSR support
  const queryClient = getQueryClient();

  // Context7 official prefetch pattern - EXACT match with examples
  try {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.subscriptions.list, // CRITICAL FIX: Static array like official examples
        queryFn: getSubscriptionsService,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.paymentMethods.list, // CRITICAL FIX: Static array like official examples
        queryFn: getPaymentMethodsService,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.payments.list, // CRITICAL FIX: Static array like official examples
        queryFn: getPaymentsService,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.products.list, // CRITICAL FIX: Static array like official examples
        queryFn: getProductsService,
      }),
    ]);
  } catch {
    // Prefetch errors shouldn't break the page - fail silently
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
