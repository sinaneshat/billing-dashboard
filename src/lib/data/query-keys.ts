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

  // Image queries
  images: {
    all: ['images'],
    avatars: (userId?: string) => ['images', 'avatars', userId || 'all'],
    currentAvatar: () => ['images', 'avatars', 'current'],
    filtered: (query?: string) => ['images', 'filtered', query],
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

  // When images change
  images: [
    queryKeys.images.all,
    queryKeys.auth.session, // User avatar affects session
    queryKeys.users.current(), // User avatar affects current user
  ],

  // When user avatar changes
  userAvatar: [
    queryKeys.images.avatars(),
    queryKeys.images.currentAvatar(),
    queryKeys.auth.all,
    queryKeys.users.current(),
  ],

  // When organization images change
  organizationImages: () => [queryKeys.images.all],
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
  ],

  // Stable data - rarely changes
  stable: [
    'organizations.detail',
  ],

  // Critical data - important for app state
  critical: [
    'auth.current',
    'users.current',
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
};
