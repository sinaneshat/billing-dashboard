/**
 * API Services - Centralized Exports
 *
 * Single import point for all API service functions and types
 * Follows the pattern from commit a24d1f67d90381a2e181818f93b6a7ad63c062cc
 */

// ============================================================================
// Checkout Service Exports
// ============================================================================

export {
  type CreateCheckoutSessionRequest,
  type CreateCheckoutSessionResponse,
  createCheckoutSessionService,
  type SyncAfterCheckoutRequest,
  type SyncAfterCheckoutResponse,
  syncAfterCheckoutService,
} from './checkout';

// ============================================================================
// Customer Portal Service Exports
// ============================================================================

export {
  type CreateCustomerPortalSessionRequest,
  type CreateCustomerPortalSessionResponse,
  createCustomerPortalSessionService,
} from './customer-portal';

// ============================================================================
// Subscriptions Service Exports
// ============================================================================

export {
  type GetProductRequest,
  type GetProductResponse,
  getProductService,
  type GetProductsRequest,
  type GetProductsResponse,
  getProductsService,
} from './products';

// ============================================================================
// Checkout Service Exports
// ============================================================================

export {
  type GetSubscriptionRequest,
  type GetSubscriptionResponse,
  getSubscriptionService,
  type GetSubscriptionsRequest,
  type GetSubscriptionsResponse,
  getSubscriptionsService,
} from './subscriptions';
