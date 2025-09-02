/**
 * Reusable OpenAPI error response definitions for createRoute
 * Uses HttpStatusCodes from stoker for consistency
 */

import type { Context } from 'hono';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { ApiEnv } from '@/api/types';

import { ErrorResponseDataSchema } from './schemas';

/**
 * Common OpenAPI error response definitions
 * Use these in createRoute responses instead of duplicating
 */
export const OpenAPIErrorResponses = {
  [HttpStatusCodes.BAD_REQUEST]: {
    description: 'Bad Request - Invalid request data',
    content: {
      'application/json': { schema: ErrorResponseDataSchema },
    },
  },
  [HttpStatusCodes.UNAUTHORIZED]: {
    description: 'Unauthorized - Authentication required',
    content: {
      'application/json': { schema: ErrorResponseDataSchema },
    },
  },
  [HttpStatusCodes.FORBIDDEN]: {
    description: 'Forbidden - Access denied',
    content: {
      'application/json': { schema: ErrorResponseDataSchema },
    },
  },
  [HttpStatusCodes.NOT_FOUND]: {
    description: 'Not Found - Resource not found',
    content: {
      'application/json': { schema: ErrorResponseDataSchema },
    },
  },
  [HttpStatusCodes.CONFLICT]: {
    description: 'Conflict - Resource already exists',
    content: {
      'application/json': { schema: ErrorResponseDataSchema },
    },
  },
  [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
    description: 'Validation Error - Invalid input data',
    content: {
      'application/json': { schema: ErrorResponseDataSchema },
    },
  },
  [HttpStatusCodes.REQUEST_TOO_LONG]: {
    description: 'Payload Too Large - Request entity too large',
    content: {
      'application/json': { schema: ErrorResponseDataSchema },
    },
  },
  [HttpStatusCodes.INTERNAL_SERVER_ERROR]: {
    description: 'Internal Server Error - Server error occurred',
    content: {
      'application/json': { schema: ErrorResponseDataSchema },
    },
  },
  [HttpStatusCodes.BAD_GATEWAY]: {
    description: 'Bad Gateway - External service error',
    content: {
      'application/json': { schema: ErrorResponseDataSchema },
    },
  },
} as const;

/**
 * Helper function to pick specific error responses
 * Usage: errorResponses([HttpStatusCodes.BAD_REQUEST, HttpStatusCodes.NOT_FOUND])
 */
export function errorResponses<T extends keyof typeof OpenAPIErrorResponses>(
  codes: readonly T[],
): Pick<typeof OpenAPIErrorResponses, T> {
  const result = {} as Pick<typeof OpenAPIErrorResponses, T>;
  for (const code of codes) {
    result[code] = OpenAPIErrorResponses[code];
  }
  return result;
}

/**
 * Common error response combinations for different route types
 */
export const CommonErrorResponses = {
  // Basic CRUD operations
  crud: errorResponses([
    HttpStatusCodes.BAD_REQUEST,
    HttpStatusCodes.UNAUTHORIZED,
    HttpStatusCodes.NOT_FOUND,
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),

  // Create operations
  create: errorResponses([
    HttpStatusCodes.BAD_REQUEST,
    HttpStatusCodes.UNAUTHORIZED,
    HttpStatusCodes.CONFLICT,
    HttpStatusCodes.UNPROCESSABLE_ENTITY,
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),

  // List/Read operations
  read: errorResponses([
    HttpStatusCodes.UNAUTHORIZED,
    HttpStatusCodes.FORBIDDEN,
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),

  // Update operations
  update: errorResponses([
    HttpStatusCodes.BAD_REQUEST,
    HttpStatusCodes.UNAUTHORIZED,
    HttpStatusCodes.NOT_FOUND,
    HttpStatusCodes.CONFLICT,
    HttpStatusCodes.UNPROCESSABLE_ENTITY,
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),

  // Delete operations
  delete: errorResponses([
    HttpStatusCodes.UNAUTHORIZED,
    HttpStatusCodes.FORBIDDEN,
    HttpStatusCodes.NOT_FOUND,
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),

  // File upload operations
  upload: errorResponses([
    HttpStatusCodes.BAD_REQUEST,
    HttpStatusCodes.UNAUTHORIZED,
    HttpStatusCodes.FORBIDDEN,
    HttpStatusCodes.REQUEST_TOO_LONG,
    HttpStatusCodes.UNPROCESSABLE_ENTITY,
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),

  // Authentication operations
  auth: errorResponses([
    HttpStatusCodes.BAD_REQUEST,
    HttpStatusCodes.UNAUTHORIZED,
    HttpStatusCodes.FORBIDDEN,
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),

  // Validation operations
  validation: errorResponses([
    HttpStatusCodes.BAD_REQUEST,
    HttpStatusCodes.UNPROCESSABLE_ENTITY,
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),

  // Public endpoints (health checks, etc)
  public: errorResponses([
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),
} as const;

// =============================================================================
// Runtime Error Response Utilities
// =============================================================================

export type ErrorResponseData = {
  error: string;
  message: string;
  details?: unknown;
  timestamp: string;
  request_id?: string;
};

export type PaginationInfo = {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
};

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  c: Context<ApiEnv>,
  error: string,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 = 400,
  details?: unknown,
) {
  const errorResponse: ErrorResponseData = {
    error,
    message,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    errorResponse.details = details;
  }

  const requestId = c.get('requestId');
  if (requestId) {
    errorResponse.request_id = requestId;
  }

  return c.json(errorResponse, status);
}

/**
 * Creates a paginated response with standard pagination metadata
 */
export function createPaginatedResponse<T>(
  c: Context<ApiEnv>,
  data: T[],
  pagination: PaginationInfo,
  meta?: Record<string, unknown>,
) {
  return c.json({
    success: true,
    data,
    meta: {
      ...meta,
      pagination,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Common business logic error responses using createErrorResponse
 */
export const BusinessErrors = {
  ApiKeyInvalid: (c: Context<ApiEnv>) =>
    createErrorResponse(c, 'invalid_api_key', 'The provided API key is invalid or expired', 401),

  ApiKeyInsufficientScope: (c: Context<ApiEnv>, requiredScope: string, availableScopes: string[]) =>
    createErrorResponse(c, 'insufficient_scope', `This operation requires the '${requiredScope}' scope`, 403, {
      required_scope: requiredScope,
      available_scopes: availableScopes,
    }),

  ApiKeyRateLimited: (c: Context<ApiEnv>, resetTime: number) => {
    const retryAfter = resetTime - Math.floor(Date.now() / 1000);
    c.header('Retry-After', String(retryAfter));
    c.header('X-RateLimit-Remaining', '0');
    c.header('X-RateLimit-Reset', String(resetTime));
    return createErrorResponse(c, 'rate_limit_exceeded', 'API rate limit exceeded', 429, {
      retry_after: retryAfter,
    });
  },

  UserNotFound: (c: Context<ApiEnv>) =>
    createErrorResponse(c, 'user_not_found', 'User not found', 404),

  SubscriptionNotFound: (c: Context<ApiEnv>) =>
    createErrorResponse(c, 'subscription_not_found', 'Subscription not found', 404),

  PaymentNotFound: (c: Context<ApiEnv>) =>
    createErrorResponse(c, 'payment_not_found', 'Payment not found', 404),

  PaymentMethodNotFound: (c: Context<ApiEnv>) =>
    createErrorResponse(c, 'payment_method_not_found', 'Payment method not found', 404),

  WebhookEndpointNotFound: (c: Context<ApiEnv>) =>
    createErrorResponse(c, 'webhook_endpoint_not_found', 'Webhook endpoint not found', 404),

  SubscriptionNotActive: (c: Context<ApiEnv>) =>
    createErrorResponse(c, 'subscription_not_active', 'Subscription is not active', 400),

  PaymentFailed: (c: Context<ApiEnv>, reason?: string) =>
    createErrorResponse(c, 'payment_failed', reason || 'Payment processing failed', 400),

  WebhookDeliveryFailed: (c: Context<ApiEnv>, error: string) =>
    createErrorResponse(c, 'webhook_delivery_failed', 'Webhook delivery failed', 400, { error }),

  // ZarinPal-specific business errors
  ZarinPalMerchantInvalid: (c: Context<ApiEnv>) =>
    createErrorResponse(c, 'zarinpal_merchant_invalid', 'Invalid ZarinPal merchant configuration', 400, {
      zarinpal_code: -74,
      action_required: 'Contact support to update merchant configuration',
    }),

  ZarinPalMerchantNoAccess: (c: Context<ApiEnv>) =>
    createErrorResponse(c, 'zarinpal_merchant_no_access', 'Direct debit service is not activated for this account. Please contact support to enable this feature.', 400, {
      zarinpal_code: -80,
      action_required: 'Request direct debit service activation from ZarinPal support',
    }),

  ZarinPalServiceUnavailable: (c: Context<ApiEnv>) =>
    createErrorResponse(c, 'zarinpal_service_unavailable', 'ZarinPal payment service is temporarily unavailable', 500),

  ZarinPalContractFailed: (c: Context<ApiEnv>, zarinpalCode: number, zarinpalMessage: string) =>
    createErrorResponse(c, 'zarinpal_contract_failed', zarinpalMessage, 400, {
      zarinpal_code: zarinpalCode,
      provider: 'zarinpal',
    }),

  ZarinPalTransactionFailed: (c: Context<ApiEnv>, zarinpalCode: number, zarinpalMessage: string) =>
    createErrorResponse(c, 'zarinpal_transaction_failed', zarinpalMessage, 400, {
      zarinpal_code: zarinpalCode,
      provider: 'zarinpal',
    }),

  // Route-specific error response helpers that match exact route schema types

  // Admin route errors (auth only: 400 | 401 | 403 | 500)
  AdminAuthError: (c: Context<ApiEnv>, error: string, message: string, status: 400 | 401 | 403 | 500 = 401) =>
    createErrorResponse(c, error, message, status),

  AdminInvalidCredentials: (c: Context<ApiEnv>) =>
    createErrorResponse(c, 'invalid_credentials', 'Invalid admin credentials', 401),

  AdminAccessDenied: (c: Context<ApiEnv>) =>
    createErrorResponse(c, 'access_denied', 'Admin access required', 403),

  AdminServerError: (c: Context<ApiEnv>) =>
    createErrorResponse(c, 'server_error', 'Internal server error', 500),

  // Direct debit route errors (auth + validation + BAD_GATEWAY)
  DirectDebitAuthError: (c: Context<ApiEnv>, error: string, message: string, status: 400 | 401 | 403 | 422 | 500 | 502 = 400) =>
    createErrorResponse(c, error, message, status),

  DirectDebitServiceError: (c: Context<ApiEnv>) =>
    createErrorResponse(c, 'service_unavailable', 'Direct debit service temporarily unavailable', 502),
};
