// Auth queries have been replaced with Better Auth client hooks
// Use useSession() from '@/lib/auth/client' instead
export {
  useHealthQuery,
  usePrefetchHealth,
} from './health';
// Image queries removed - user image comes from session data
// Use session.user.image directly instead of making API calls
export {
  usePaymentMethodsQuery,
  usePrefetchPaymentMethods,
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
