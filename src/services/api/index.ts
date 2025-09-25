// Auth service removed - using Better Auth directly

// Payment Methods service exports
export {
  type CancelDirectDebitContractRequest,
  type CancelDirectDebitContractResponse,
  cancelDirectDebitContractService,
  // Consolidated direct debit contract flow (3 endpoints)
  type CreateDirectDebitContractRequest,
  type CreateDirectDebitContractResponse,
  createDirectDebitContractService,
  // Basic payment method management
  type GetPaymentMethodsRequest,
  type GetPaymentMethodsResponse,
  getPaymentMethodsService,
  // Recovery service for failed verifications
  type RecoverDirectDebitContractRequest,
  type RecoverDirectDebitContractResponse,
  recoverDirectDebitContractService,
  // Set default payment method
  type SetDefaultPaymentMethodRequest,
  type SetDefaultPaymentMethodResponse,
  setDefaultPaymentMethodService,
  type VerifyDirectDebitContractRequest,
  type VerifyDirectDebitContractResponse,
  verifyDirectDebitContractService,
} from './payment-methods';

// Payments service exports
export {
  type GetPaymentsResponse,
  getPaymentsService,
} from './payments';

// Products service exports
export {
  type GetProductsRequest,
  type GetProductsResponse,
  getProductsService,
} from './products';

// Subscriptions service exports
export {
  type CancelSubscriptionRequest,
  type CancelSubscriptionResponse,
  cancelSubscriptionService,
  type CreateSubscriptionRequest,
  type CreateSubscriptionResponse,
  createSubscriptionService,
  type GetSubscriptionRequest,
  type GetSubscriptionResponse,
  getSubscriptionService,
  type GetSubscriptionsRequest,
  type GetSubscriptionsResponse,
  getSubscriptionsService,
  type SwitchSubscriptionRequest,
  type SwitchSubscriptionResponse,
  switchSubscriptionService,
} from './subscriptions';
