import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type React from 'react';

import { requireAuth } from '@/app/auth/actions';
import { prefetchStrategies } from '@/lib/data/prefetch-utils';
import { getQueryClient } from '@/lib/data/query-client';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Simplified: Single function call handles auth check and redirect
  await requireAuth();

  // Create query client with streaming SSR support
  const queryClient = getQueryClient();

  // Prefetch essential user data for all authenticated pages
  // This improves perceived performance by preloading critical data
  try {
    await prefetchStrategies.essential(queryClient);
  } catch (error) {
    // Prefetch errors shouldn't break the page - log and continue
    console.warn('Failed to prefetch essential data:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
