import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import type { GetProductsRequest } from '@/services/api/products';
import { getProductsService } from '@/services/api/products';

/**
 * Hook to fetch all available products
 * Following the Shakewell pattern for React Query hooks
 */
export function useProductsQuery(args?: GetProductsRequest) {
  return useQuery({
    queryKey: queryKeys.products.list(args),
    queryFn: () => getProductsService(args),
    staleTime: 10 * 60 * 1000, // 10 minutes - products are relatively stable
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
  });
}

/**
 * Hook to prefetch products data
 * Useful for optimistic loading
 */
export function usePrefetchProducts() {
  const queryClient = useQueryClient();

  return (args?: GetProductsRequest) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.list(args),
      queryFn: () => getProductsService(args),
      staleTime: 10 * 60 * 1000,
    });
  };
}
