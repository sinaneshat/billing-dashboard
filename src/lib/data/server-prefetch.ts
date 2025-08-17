/**
 * Server-side prefetching utilities for TanStack Query
 * Used ONLY for API data - NOT for Better Auth
 *
 * Better Auth data should be fetched directly using:
 * - auth.api.getSession()
 * - auth.api.listOrganizations()
 * - etc.
 */

import type { QueryClient } from '@tanstack/react-query';

/**
 * Prefetch API data on the server
 * Use this in server components to prefetch data that will be needed client-side
 *
 * @example
 * ```tsx
 * // In a server component (page.tsx)
 * import { getQueryClient } from '@/lib/data/query-client';
 * import { prefetchQuery } from '@/lib/data/server-prefetch';
 * import { queryKeys } from '@/lib/data/query-keys';
 * import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
 *
 * export default async function Page() {
 *   const queryClient = getQueryClient();
 *
 *   // Prefetch API data
 *   await prefetchQuery(queryClient, {
 *     queryKey: queryKeys.health.check(),
 *     queryFn: async () => {
 *       const response = await fetch('/api/v1/health');
 *       return response.json();
 *     },
 *   });
 *
 *   return (
 *     <HydrationBoundary state={dehydrate(queryClient)}>
 *       <YourComponent />
 *     </HydrationBoundary>
 *   );
 * }
 * ```
 */
export async function prefetchQuery<T>(
  queryClient: QueryClient,
  options: {
    queryKey: readonly unknown[];
    queryFn: () => Promise<T>;
  },
): Promise<void> {
  try {
    await queryClient.prefetchQuery({
      queryKey: options.queryKey,
      queryFn: options.queryFn,
    });
  } catch (error) {
    // Log error in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('[prefetchQuery] Failed to prefetch:', options.queryKey, error);
    }
    // Don't throw - let the page render even if prefetch fails
  }
}

/**
 * Prefetch multiple queries in parallel
 * Useful for prefetching all data needed for a page
 */
export async function prefetchQueries(
  queryClient: QueryClient,
  queries: Array<{
    queryKey: readonly unknown[];
    queryFn: () => Promise<unknown>;
  }>,
): Promise<void> {
  // Execute all prefetches in parallel
  const results = await Promise.allSettled(
    queries.map(query =>
      queryClient.prefetchQuery({
        queryKey: query.queryKey,
        queryFn: query.queryFn,
      }),
    ),
  );

  // Log failures in development
  if (process.env.NODE_ENV === 'development') {
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error('[prefetchQueries] Failed to prefetch:', queries[index]?.queryKey, result.reason);
      }
    });
  }
}

/**
 * Conditionally prefetch based on runtime conditions
 * Useful for user-specific or feature-flagged data
 */
export async function prefetchConditional<T>(
  queryClient: QueryClient,
  condition: boolean | (() => boolean | Promise<boolean>),
  options: {
    queryKey: readonly unknown[];
    queryFn: () => Promise<T>;
  },
): Promise<void> {
  const shouldPrefetch = typeof condition === 'function'
    ? await Promise.resolve(condition())
    : condition;

  if (shouldPrefetch) {
    await prefetchQuery(queryClient, options);
  }
}
