// Auth service exports
export {
  type GetCurrentUserResponse,
  getCurrentUserService,
} from './auth';

// Health service exports
export {
  type CheckDetailedHealthResponse,
  checkDetailedHealthService,
  type CheckHealthResponse,
  checkHealthService,
} from './health';

// Image service exports
export {
  createImagePreviewService,
  type DeleteImageResponse,
  deleteImageService,
  getImageMetadataService,
  type GetImagesResponse,
  getImagesService,
  // getUserAvatarsService, // Removed - use session.user.image instead
  replaceUserAvatarService,
  revokeImagePreviewService,
  type UploadUserAvatarResponse,
  uploadUserAvatarService,
  validateImageFileService,
} from './images';

// Payment Methods service exports
export {
  type CreatePaymentMethodRequest,
  type CreatePaymentMethodResponse,
  createPaymentMethodService,
  type DeletePaymentMethodRequest,
  type DeletePaymentMethodResponse,
  deletePaymentMethodService,
  type GetPaymentMethodsRequest,
  type GetPaymentMethodsResponse,
  getPaymentMethodsService,
  type InitiateDirectDebitContractRequest,
  type InitiateDirectDebitContractResponse,
  initiateDirectDebitContractService,
  type SetDefaultPaymentMethodRequest,
  type SetDefaultPaymentMethodResponse,
  setDefaultPaymentMethodService,
  type VerifyDirectDebitContractRequest,
  type VerifyDirectDebitContractResponse,
  verifyDirectDebitContractService,
} from './payment-methods';

// Payments service exports
export {
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
