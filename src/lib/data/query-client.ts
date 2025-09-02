import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient configuration for both server and client
 * Used for API data fetching only - NOT for Better Auth
 *
 * Optimized for SSR with proper hydration boundaries
 * Following TanStack Query Context7 best practices
 */

// Enhanced default options for SSR optimization
const defaultQueryOptions = {
  queries: {
    // SSR-optimized stale times
    staleTime: 5 * 60 * 1000, // 5 minutes - good for SSR hydration
    gcTime: 30 * 60 * 1000, // 30 minutes - keep data for navigation
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    // SSR-specific: prevent immediate refetch after hydration
    refetchOnReconnect: 'always' as const,
    networkMode: 'online' as const,
  },
  mutations: {
    retry: 1,
    retryDelay: 1000,
    networkMode: 'online' as const,
  },
};

// Server-specific options for optimal SSR performance
const serverQueryOptions = {
  queries: {
    ...defaultQueryOptions.queries,
    // Server-specific overrides for SSR
    retry: false, // Don't retry on server - fail fast
    refetchOnMount: false, // Server data is always fresh
    refetchOnReconnect: false, // Not applicable on server
    refetchOnWindowFocus: false, // Not applicable on server
    staleTime: Infinity, // Server data is never stale during SSR
    gcTime: 0, // Don't cache on server after request
  },
  mutations: {
    ...defaultQueryOptions.mutations,
    retry: false, // Don't retry mutations on server
  },
};

// Singleton instance for client-side
let clientQueryClient: QueryClient | undefined;

/**
 * Get or create QueryClient instance optimized for SSR
 * - On server: always creates new instance with SSR-optimized config
 * - On client: returns singleton instance with hydration-ready config
 */
export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create new instance for each request
    return new QueryClient({
      defaultOptions: serverQueryOptions,
    });
  } else {
    // Client: use singleton with hydration-ready config
    if (!clientQueryClient) {
      clientQueryClient = new QueryClient({
        defaultOptions: defaultQueryOptions,
      });
    }
    return clientQueryClient;
  }
}

/**
 * Create a fresh server-side QueryClient for SSR
 * Used in server components and API routes for data prefetching
 */
export function createServerQueryClient() {
  return new QueryClient({
    defaultOptions: serverQueryOptions,
  });
}

/**
 * Get the client-side QueryClient singleton
 * Used in client components after hydration
 */
export function getClientQueryClient() {
  if (typeof window === 'undefined') {
    throw new TypeError('getClientQueryClient can only be called on the client side');
  }

  if (!clientQueryClient) {
    clientQueryClient = new QueryClient({
      defaultOptions: defaultQueryOptions,
    });
  }

  return clientQueryClient;
}
