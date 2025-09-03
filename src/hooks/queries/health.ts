import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { checkHealthService } from '@/services/api/health';

export function useHealthQuery() {
  return useQuery({
    queryKey: queryKeys.health.status,
    queryFn: () => checkHealthService(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
}
