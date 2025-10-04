/**
 * Chat Memories Query Hooks
 *
 * TanStack Query hooks for chat memory/preset operations
 * Following patterns from TanStack Query v5 infinite query documentation
 */

'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/data/query-keys';
import {
  getMemoryService,
  listMemoriesService,
} from '@/services/api';

/**
 * Hook to fetch user memories with cursor-based infinite scrolling
 * Uses TanStack Query useInfiniteQuery for seamless pagination
 * Protected endpoint - requires authentication
 *
 * Following TanStack Query v5 official patterns:
 * - Cursor-based pagination for infinite scroll
 * - Automatic page management via data.pages
 * - Built-in hasNextPage and fetchNextPage
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useMemoriesQuery();
 *
 * // Render pages
 * data?.pages.map((page) =>
 *   page.data.items.map((memory) => <MemoryCard key={memory.id} memory={memory} />)
 * )
 *
 * // Load more button
 * <button onClick={() => fetchNextPage()} disabled={!hasNextPage}>
 *   {isFetchingNextPage ? 'Loading...' : 'Load More'}
 * </button>
 * ```
 *
 * Stale time: 1 minute (memories change less frequently)
 */
export function useMemoriesQuery() {
  const { data: session, isPending } = useSession();
  const isAuthenticated = !isPending && !!session?.user?.id;

  return useInfiniteQuery({
    queryKey: queryKeys.memories.lists(),
    queryFn: ({ pageParam }) =>
      listMemoriesService(
        pageParam ? { query: { cursor: pageParam } } : undefined,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      // Return nextCursor from pagination metadata, or undefined if no more pages
      if (lastPage.success && lastPage.data.pagination.nextCursor) {
        return lastPage.data.pagination.nextCursor;
      }
      return undefined;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && error.message.includes('Authentication')) {
        return false;
      }
      // Don't retry on client errors (4xx)
      const errorStatus = (error as { status?: number })?.status;
      if (errorStatus && errorStatus >= 400 && errorStatus < 500) {
        return false;
      }
      return failureCount < 2;
    },
    enabled: isAuthenticated, // Only fetch when authenticated
    throwOnError: false,
  });
}

/**
 * Hook to fetch a specific memory by ID
 * Returns memory details including title, content, and tags
 * Protected endpoint - requires authentication
 *
 * @param memoryId - Memory ID
 * @param enabled - Optional control over whether to fetch (default: true when memoryId exists)
 *
 * Stale time: 2 minutes (memory details change infrequently)
 */
export function useMemoryQuery(memoryId: string | null | undefined, enabled = true) {
  const { data: session, isPending } = useSession();
  const isAuthenticated = !isPending && !!session?.user?.id;

  return useQuery({
    queryKey: queryKeys.memories.detail(memoryId || ''),
    queryFn: () => getMemoryService(memoryId!),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: isAuthenticated && !!memoryId && enabled, // Only fetch when authenticated and memoryId exists
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('Authentication')) {
        return false;
      }
      const errorStatus = (error as { status?: number })?.status;
      if (errorStatus && errorStatus >= 400 && errorStatus < 500) {
        return false;
      }
      return failureCount < 2;
    },
    throwOnError: false,
  });
}
