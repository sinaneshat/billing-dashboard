// ============================================================================
// MUTATION HOOKS BY DOMAIN
// ============================================================================

// Direct debit contract management
export {
  useCancelDirectDebitContractMutation,
  useCreateDirectDebitContractMutation,
  useInitiateDirectDebitContractMutation,
  useSetDefaultPaymentMethodMutation,
  useVerifyDirectDebitContractMutation,
} from './payment-methods';

// Subscription lifecycle management
export {
  useCancelSubscriptionMutation,
  useChangePlanMutation,
  useCreateSubscriptionMutation,
} from './subscriptions';
