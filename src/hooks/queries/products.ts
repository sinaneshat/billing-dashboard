import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { getProductsService } from '@/services/api/products';

/**
 * Hook to fetch ALL available products (no pagination)
 * Context7 official pattern - EXACT match with server prefetch
 */
export function useProductsQuery() {
  return useQuery({
    queryKey: queryKeys.products.list, // CRITICAL FIX: Static array like official examples
    queryFn: getProductsService,
    staleTime: 2 * 60 * 60 * 1000, // CRITICAL FIX: Match ISR revalidation (2 hours)
    retry: 2,
    throwOnError: false,
  });
}
