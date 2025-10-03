/**
 * Query Hooks - Centralized Exports
 *
 * Single import point for all TanStack Query hooks
 * Following patterns from commit a24d1f67d90381a2e181818f93b6a7ad63c062cc
 */

// ============================================================================
// QUERY HOOKS BY DOMAIN
// ============================================================================

// Product queries (public)
export { useProductQuery, useProductsQuery } from './products';

// Subscription queries (protected)
export {
  useCurrentSubscriptionQuery,
  useSubscriptionQuery,
  useSubscriptionsQuery,
} from './subscriptions';
