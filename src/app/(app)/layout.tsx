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

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Simplified: Single function call handles auth check and redirect
  await requireAuth();

  // Create query client with streaming SSR support
  const queryClient = getQueryClient();

  // Simple prefetch - dashboard essentials
  try {
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: queryKeys.subscriptions.list(),
        queryFn: () => getSubscriptionsService(),
        staleTime: 2 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.paymentMethods.list(),
        queryFn: () => getPaymentMethodsService(),
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.products.list(),
        queryFn: () => getProductsService(),
        staleTime: 10 * 60 * 1000,
      }),
    ]);
  } catch {
    // Prefetch errors shouldn't break the page
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
