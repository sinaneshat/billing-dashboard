import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import { getProductsService } from '@/services/api/products';

/**
 * Hook to fetch ALL available products (no pagination)
 * Simple TanStack Query pattern - shows all products always
 */
export function useProductsQuery() {
  return useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: () => getProductsService(), // No args = fetch all products
    staleTime: 10 * 60 * 1000, // 10 minutes - products are stable
    retry: 2,
    throwOnError: false,
  });
}
