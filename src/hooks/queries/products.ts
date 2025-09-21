import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { getProductsService } from '@/services/api/products';

/**
 * Hook to fetch all available products (no pagination)
 * Products are public data - no authentication required
 * Longer stale time since products change infrequently
 */
export function useProductsQuery() {
  return useQuery({
    queryKey: queryKeys.products.list,
    queryFn: getProductsService,
    staleTime: 2 * 60 * 60 * 1000, // 2 hours - products change infrequently
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx)
      const errorStatus = (error as { status?: number })?.status;
      if (errorStatus && errorStatus >= 400 && errorStatus < 500) {
        return false;
      }
      return failureCount < 2;
    },
    throwOnError: false,
  });
}
