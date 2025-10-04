/**
 * Chat Custom Roles Query Hooks
 *
 * TanStack Query hooks for custom role template operations
 * Following patterns from TanStack Query v5 infinite query documentation
 */

'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/data/query-keys';
import {
  getCustomRoleService,
  listCustomRolesService,
} from '@/services/api';

/**
 * Hook to fetch user custom roles with cursor-based infinite scrolling
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
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useCustomRolesQuery();
 *
 * // Render pages
 * data?.pages.map((page) =>
 *   page.data.items.map((role) => <RoleCard key={role.id} role={role} />)
 * )
 *
 * // Load more button
 * <button onClick={() => fetchNextPage()} disabled={!hasNextPage}>
 *   {isFetchingNextPage ? 'Loading...' : 'Load More'}
 * </button>
 * ```
 *
 * Stale time: 2 minutes (custom roles change infrequently)
 */
export function useCustomRolesQuery() {
  const { data: session, isPending } = useSession();
  const isAuthenticated = !isPending && !!session?.user?.id;

  return useInfiniteQuery({
    queryKey: queryKeys.customRoles.lists(),
    queryFn: ({ pageParam }) =>
      listCustomRolesService(
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
    staleTime: 2 * 60 * 1000, // 2 minutes
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
 * Hook to fetch a specific custom role by ID
 * Returns custom role details including name, description, and default settings
 * Protected endpoint - requires authentication
 *
 * @param roleId - Custom role ID
 * @param enabled - Optional control over whether to fetch (default: true when roleId exists)
 *
 * Stale time: 5 minutes (custom role details change very infrequently)
 */
export function useCustomRoleQuery(roleId: string | null | undefined, enabled = true) {
  const { data: session, isPending } = useSession();
  const isAuthenticated = !isPending && !!session?.user?.id;

  return useQuery({
    queryKey: queryKeys.customRoles.detail(roleId || ''),
    queryFn: () => getCustomRoleService(roleId!),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isAuthenticated && !!roleId && enabled, // Only fetch when authenticated and roleId exists
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
