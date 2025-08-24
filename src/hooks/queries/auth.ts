import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { getCurrentUserService } from '@/services/api/auth';

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: queryKeys.auth.current,
    queryFn: getCurrentUserService,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAuthSessionQuery() {
  return useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: getCurrentUserService,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
