import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

/**
 * Create QueryClient with proper SSR defaults
 * Following TanStack Query official best practices from Context7 docs
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000, // 60 seconds
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      },
      dehydrate: {
        // Only include successful queries in dehydration by default
        shouldDehydrateQuery: query =>
          query.state.status === 'success',
      },
    },
  });
}

/**
 * Server-side QueryClient factory
 * cache() is scoped per request, so we don't leak data between requests
 * Following official TanStack Query pattern from Context7 docs
 */
const getQueryClient = cache(() => makeQueryClient());

export default getQueryClient;
