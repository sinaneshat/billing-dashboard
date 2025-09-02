'use client';

/**
 * Simple HydrationBoundary provider - following Context7 official patterns
 * Based on official TanStack Query Next.js App Router examples
 */

import { HydrationBoundary, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { getClientQueryClient } from '@/lib/data/query-client';

/**
 * Simple HydrationBoundary provider - official TanStack Query pattern
 * Use this exactly as shown in Context7 documentation examples
 */
export function HydrationBoundaryProvider({
  children,
  dehydratedState,
}: {
  children: ReactNode;
  dehydratedState?: unknown;
}) {
  // Official pattern: create stable QueryClient instance
  const [queryClient] = useState(() => getClientQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        {children}
      </HydrationBoundary>
    </QueryClientProvider>
  );
}

export default HydrationBoundaryProvider;
