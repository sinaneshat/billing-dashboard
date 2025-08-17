import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { checkHealth } from '@/services/api/health';

/**
 * Query hook for checking system health status
 * Single responsibility: Fetch health check information
 */
export function useHealthQuery() {
  return useQuery({
    queryKey: queryKeys.health.status,
    queryFn: () => checkHealth(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Create index.ts for queries
