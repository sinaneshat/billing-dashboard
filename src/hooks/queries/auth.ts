import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { getCurrentUserService } from '@/services/api/auth';

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: queryKeys.auth.current,
    queryFn: getCurrentUserService,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
  });
}

export function useAuthSessionQuery() {
  return useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: getCurrentUserService,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
  });
}

/**
 * Hook to prefetch current user data
 * Useful for optimistic loading before user navigates to authenticated pages
 */
export function usePrefetchCurrentUser() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.auth.current,
      queryFn: getCurrentUserService,
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Hook to prefetch auth session data
 * Useful for authentication state checks
 */
export function usePrefetchAuthSession() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.auth.session,
      queryFn: getCurrentUserService,
      staleTime: 5 * 60 * 1000,
    });
  };
}
