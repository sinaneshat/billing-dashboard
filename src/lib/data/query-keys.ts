/**
 * Query Key Factory System
 *
 * Centralized query key generation for TanStack Query
 * Ensures consistency between server prefetch and client queries
 * Prevents cache mismatches and enables hierarchical invalidation
 */

/**
 * Factory functions for type-safe query key generation
 */
const QueryKeyFactory = {
  base: (resource: string) => [resource] as const,
  list: (resource: string) => [resource, 'list'] as const,
  detail: (resource: string, id: string) => [resource, 'detail', id] as const,
  current: (resource: string) => [resource, 'current'] as const,
  all: (resource: string) => [resource, 'all'] as const,
  action: (resource: string, action: string, ...params: string[]) =>
    [resource, action, ...params] as const,
} as const;

/**
 * Billing domain query keys
 */
export const queryKeys = {
  // Products
  products: {
    all: QueryKeyFactory.base('products'),
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: () => QueryKeyFactory.list('products'),
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => QueryKeyFactory.detail('products', id),
  },

  // Subscriptions
  subscriptions: {
    all: QueryKeyFactory.base('subscriptions'),
    lists: () => [...queryKeys.subscriptions.all, 'list'] as const,
    list: () => QueryKeyFactory.list('subscriptions'),
    details: () => [...queryKeys.subscriptions.all, 'detail'] as const,
    detail: (id: string) => QueryKeyFactory.detail('subscriptions', id),
    current: () => QueryKeyFactory.current('subscriptions'),
  },

  // Checkout
  checkout: {
    all: QueryKeyFactory.base('checkout'),
    session: (sessionId: string) => QueryKeyFactory.action('checkout', 'session', sessionId),
  },
} as const;

/**
 * Invalidation patterns for common operations
 * Use these to invalidate related queries after mutations
 */
export const invalidationPatterns = {
  // Product operations
  products: [queryKeys.products.all],

  productDetail: (productId: string) => [
    queryKeys.products.detail(productId),
    queryKeys.products.lists(),
  ],

  // Subscription operations
  subscriptions: [
    queryKeys.subscriptions.lists(),
    queryKeys.subscriptions.current(),
  ],

  subscriptionDetail: (subscriptionId: string) => [
    queryKeys.subscriptions.detail(subscriptionId),
    queryKeys.subscriptions.lists(),
    queryKeys.subscriptions.current(),
  ],

  // After checkout - invalidate everything billing related
  afterCheckout: [
    queryKeys.subscriptions.all,
    queryKeys.products.all,
  ],
} as const;
