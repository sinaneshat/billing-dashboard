/**
 * Data fetching module exports
 * Centralized TanStack Query utilities
 *
 * IMPORTANT: This is ONLY for API data fetching
 * For authentication, use @/lib/auth instead
 */

// Query client - shared between server and client
export { getQueryClient } from './query-client';

// Query keys for type-safe caching
export { queryKeys } from './query-keys';

// Server-side prefetching utilities
export {
  prefetchConditional,
  prefetchQueries,
  prefetchQuery,
} from './server-prefetch';
