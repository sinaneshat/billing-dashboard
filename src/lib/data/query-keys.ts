export const queryKeys = {
  // Auth queries
  auth: {
    all: ['auth'],
    session: ['auth', 'session'],
    current: ['auth', 'session', 'current'],
  },

  // Organization queries - simplified for Better Auth
  organizations: {
    all: ['organizations'],
    list: () => ['organizations', 'list'],
    detail: (slug: string) => ['organizations', 'detail', slug],
    invitations: (organizationId?: string) => ['organizations', 'invitations', organizationId || 'all'],
    members: (organizationId?: string) => ['organizations', 'members', organizationId || 'all'],
  },

  // User queries - now using Better Auth sessions
  users: {
    all: ['users'],
    // Removed detail() - Better Auth only allows current user access
    current: () => ['users', 'current'],
    organizations: () => ['users', 'organizations'],
  },

  // Health queries
  health: {
    all: ['health'],
    status: ['health', 'status'],
  },

  // Image queries removed - use session.user.image instead of API calls

  // Billing queries
  products: {
    all: ['products'],
    list: (filters?: Record<string, unknown>) => ['products', 'list', ...(filters ? [filters] : [])],
  },

  subscriptions: {
    all: ['subscriptions'],
    list: (filters?: Record<string, unknown>) => ['subscriptions', 'list', ...(filters ? [filters] : [])],
    detail: (subscriptionId: string) => ['subscriptions', 'detail', subscriptionId],
    current: () => ['subscriptions', 'current'],
  },

  payments: {
    all: ['payments'],
    list: (filters?: Record<string, unknown>) => ['payments', 'list', ...(filters ? [filters] : [])],
    history: (filters?: Record<string, unknown>) => ['payments', 'history', ...(filters ? [filters] : [])],
    detail: (paymentId: string) => ['payments', 'detail', paymentId],
  },

  paymentMethods: {
    all: ['paymentMethods'],
    list: (filters?: Record<string, unknown>) => ['paymentMethods', 'list', ...(filters ? [filters] : [])],
    detail: (paymentMethodId: string) => ['paymentMethods', 'detail', paymentMethodId],
  },
};

/**
 * Simple invalidation patterns - just arrays of related keys
 *
 * When you mutate something, invalidate these related keys.
 * No complex factory functions, just common-sense relationships.
 */
export const invalidationPatterns = {
  // When auth changes, invalidate these
  auth: [
    queryKeys.auth.all,
    queryKeys.auth.session,
    queryKeys.auth.current,
    queryKeys.organizations.all,
  ],

  // When organizations change, invalidate these
  organizations: [
    queryKeys.organizations.all,
    ['organizations', 'list'], // List without filters
    queryKeys.auth.session, // May affect current org
  ],

  // When organization details change
  organizationDetail: (slug: string) => [
    queryKeys.organizations.detail(slug),
    queryKeys.organizations.all,
    queryKeys.organizations.list(),
  ],

  // When team/members change
  organizationTeam: (organizationId: string) => [
    queryKeys.organizations.members(organizationId),
    queryKeys.organizations.invitations(organizationId),
    queryKeys.organizations.all,
  ],

  // When users change
  users: [
    queryKeys.users.all,
    queryKeys.organizations.all,
  ],

  // Image invalidation patterns removed - use session.user.image instead

  // When products change
  products: [
    queryKeys.products.all,
    queryKeys.products.list(),
  ],

  // When subscriptions change
  subscriptions: [
    queryKeys.subscriptions.all,
    queryKeys.subscriptions.list(),
    queryKeys.subscriptions.current(),
  ],

  // When subscription details change
  subscriptionDetail: (subscriptionId: string) => [
    queryKeys.subscriptions.detail(subscriptionId),
    queryKeys.subscriptions.all,
    queryKeys.subscriptions.list(),
    queryKeys.subscriptions.current(),
    queryKeys.payments.all, // Subscription changes may affect payment history
  ],

  // When payments change
  payments: [
    queryKeys.payments.all,
    queryKeys.payments.history(),
  ],

  // When payment details change
  paymentDetail: (paymentId: string) => [
    queryKeys.payments.detail(paymentId),
    queryKeys.payments.all,
    queryKeys.payments.history(),
  ],

  // When payment methods change
  paymentMethods: [
    queryKeys.paymentMethods.all,
    queryKeys.paymentMethods.list(),
  ],

  // When payment method details change
  paymentMethodDetail: (paymentMethodId: string) => [
    queryKeys.paymentMethods.detail(paymentMethodId),
    queryKeys.paymentMethods.all,
    queryKeys.paymentMethods.list(),
  ],
};

/**
 * Cache strategies for different query patterns
 * Simple mapping based on query key patterns
 */
export const queryPatterns = {
  // Real-time data - frequently changing
  realtime: [
    'auth.session',
    'health.status',
  ],

  // Standard data - moderate changes
  standard: [
    'organizations.list',
    'organizations.members',
    'organizations.team',
    'users.detail',
    'subscriptions.list',
    'payments.history',
  ],

  // Stable data - rarely changes
  stable: [
    'organizations.detail',
    'products.list',
  ],

  // Critical data - important for app state
  critical: [
    'auth.current',
    'users.current',
    'subscriptions.current',
  ],

  // Background data - low priority
  background: [
    'health.all',
  ],
};

// Export commonly used patterns for convenience
export const commonQueries = {
  // Current user's organizations
  myOrganizations: queryKeys.organizations.list(),

  // Current user info
  currentUser: queryKeys.users.current(),

  // Health check
  healthStatus: queryKeys.health.status,

  // Billing related
  allProducts: queryKeys.products.list(),
  userSubscriptions: queryKeys.subscriptions.list(),
  currentSubscription: queryKeys.subscriptions.current(),
  paymentHistory: queryKeys.payments.history(),
};
