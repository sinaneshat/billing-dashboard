import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient configuration for both server and client
 * Used for API data fetching only - NOT for Better Auth
 *
 * Optimized for SSR with proper hydration boundaries
 * Following TanStack Query Context7 best practices
 */

// Enhanced default options for SSR optimization - following Context7 best practices
const defaultQueryOptions = {
  queries: {
    // SSR-optimized stale times - Context7 pattern
    staleTime: 5 * 60 * 1000, // 5 minutes - good for SSR hydration
    gcTime: 30 * 60 * 1000, // 30 minutes - keep data for navigation
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    // CRITICAL FIX: Prevent immediate refetch after hydration
    refetchOnMount: false, // Changed from true to false
    refetchOnReconnect: 'always' as const,
    networkMode: 'online' as const,
  },
  mutations: {
    retry: 1,
    retryDelay: 1000,
    networkMode: 'online' as const,
  },
};

// Server-specific options for optimal SSR performance - Context7 pattern
const serverQueryOptions = {
  queries: {
    ...defaultQueryOptions.queries,
    // Server-specific overrides for SSR
    retry: false, // Don't retry on server - fail fast
    refetchOnMount: false, // Server data is always fresh
    refetchOnReconnect: false, // Not applicable on server
    refetchOnWindowFocus: false, // Not applicable on server
    // CRITICAL FIX: Use same staleTime as client for hydration consistency
    staleTime: 5 * 60 * 1000, // Changed from Infinity to match client
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
 * Get or create QueryClient instance - Context7 official pattern
 * - On server: always creates new instance for each request
 * - On client: returns singleton instance
 */
export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: create fresh QueryClient like Context7 examples
    return new QueryClient({
      defaultOptions: {
        queries: {
          // CRITICAL FIX: Match Context7 official examples exactly
          staleTime: 60 * 1000, // 60 seconds like official examples
        },
      },
    });
  } else {
    // Client: use singleton
    if (!clientQueryClient) {
      clientQueryClient = new QueryClient({
        defaultOptions: {
          queries: {
            // CRITICAL FIX: Match Context7 official examples exactly
            staleTime: 60 * 1000, // 60 seconds like official examples
            refetchOnMount: false, // Prevent refetch after hydration
          },
        },
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
