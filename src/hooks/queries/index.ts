// Auth queries have been replaced with Better Auth client hooks
// Use useSession() from '@/lib/auth/client' instead
// Image queries removed - user image comes from session data
// Use session.user.image directly instead of making API calls

// Direct debit contract queries
export {
  useCanCreateSubscriptions,
  useDirectDebitContract,
} from './direct-debit';
export {
  usePaymentMethodsQuery,
} from './payment-methods';
// Payment queries removed - subscription platform only
export {
  useProductsQuery,
} from './products';
export {
  useCurrentSubscriptionQuery,
  useSubscriptionQuery,
  useSubscriptionsQuery,
} from './subscriptions';
