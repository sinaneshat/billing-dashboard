import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient configuration for both server and client
 * Used for API data fetching only - NOT for Better Auth
 */

// Default options for all queries
const defaultQueryOptions = {
  queries: {
    // Enhanced stale times based on data types
    staleTime: 5 * 60 * 1000, // 5 minutes (default)
    gcTime: 30 * 60 * 1000, // 30 minutes - increased for better caching
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  },
  mutations: {
    retry: 1,
    retryDelay: 1000,
  },
};

// Singleton instance for client-side
let clientQueryClient: QueryClient | undefined;

/**
 * Get or create QueryClient instance
 * - On server: always creates new instance
 * - On client: returns singleton instance
 */
export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create new instance
    return new QueryClient({
      defaultOptions: {
        ...defaultQueryOptions,
        queries: {
          ...defaultQueryOptions.queries,
          // Server-specific overrides
          retry: false, // Don't retry on server
          refetchOnMount: false, // Server data is fresh
        },
      },
    });
  } else {
    // Client: use singleton
    if (!clientQueryClient) {
      clientQueryClient = new QueryClient({
        defaultOptions: defaultQueryOptions,
      });
    }
    return clientQueryClient;
  }
}
