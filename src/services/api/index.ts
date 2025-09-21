// Auth service exports
export {
  type GetCurrentUserResponse,
  getCurrentUserService,
} from './auth';

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
  type DeletePaymentMethodRequest,
  type DeletePaymentMethodResponse,
  deletePaymentMethodService,
  // Deprecated functions (kept for backwards compatibility)
  getBankListService, // deprecated - throws error
  // Contract status (legacy)
  type GetContractStatusRequest,
  type GetContractStatusResponse,
  getContractStatusService,
  type GetPaymentMethodsRequest,
  type GetPaymentMethodsResponse,
  getPaymentMethodsService,
  initiateDirectDebitContractService, // legacy alias
  setDefaultPaymentMethodService, // convenience function
  type UpdatePaymentMethodRequest,
  type UpdatePaymentMethodResponse,
  updatePaymentMethodService,
  type VerifyDirectDebitContractRequest,
  type VerifyDirectDebitContractResponse,
  verifyDirectDebitContractService,
} from './payment-methods';

// Payments service exports
export {
  type GetPaymentsResponse,
  getPaymentsService,
  type PaymentCallbackRequest,
  type PaymentCallbackResponse,
  processPaymentCallbackService,
} from './payments';

// Products service exports
export {
  type GetProductsRequest,
  type GetProductsResponse,
  getProductsService,
} from './products';

// Subscriptions service exports
export {
  type CreateSubscriptionRequest,
  type CreateSubscriptionResponse,
  createSubscriptionService,
  type GetSubscriptionsRequest,
  type GetSubscriptionsResponse,
  getSubscriptionsService,
} from './subscriptions';
