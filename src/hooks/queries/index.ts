// Auth queries have been replaced with Better Auth client hooks
// Use useSession() from '@/lib/auth/client' instead
// Image queries removed - user image comes from session data
// Use session.user.image directly instead of making API calls

// ============================================================================
// QUERY HOOKS BY DOMAIN
// ============================================================================

// Direct debit contract analysis
export {
  useCanCreateSubscriptions,
  useDirectDebitContract,
} from './direct-debit';

// Payment methods management
export {
  usePaymentMethodsQuery,
} from './payment-methods';

// Payment history and billing records
export {
  usePaymentsQuery,
} from './payments';

// Product catalog
export {
  useProductsQuery,
} from './products';

// Subscription management
export {
  useCurrentSubscriptionQuery,
  useSubscriptionQuery,
  useSubscriptionsQuery,
} from './subscriptions';
