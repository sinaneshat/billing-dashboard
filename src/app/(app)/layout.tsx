import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type React from 'react';

import { requireAuth } from '@/app/auth/actions';
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

  // Better Auth provides all organization data through its hooks
  // No need to prefetch - Better Auth handles this internally

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
