/**
 * Reusable OpenAPI error response definitions for createRoute
 * Uses HttpStatusCodes from stoker for consistency
 */

import type { Context } from 'hono';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { ApiEnv } from '@/api/types';

import { ErrorSchema } from './schemas';

/**
 * Common OpenAPI error response definitions
 * Use these in createRoute responses instead of duplicating
 */
export const OpenAPIErrorResponses = {
  [HttpStatusCodes.BAD_REQUEST]: {
    description: 'Bad Request - Invalid request data',
    content: {
      'application/json': { schema: ErrorSchema },
    },
  },
  [HttpStatusCodes.UNAUTHORIZED]: {
    description: 'Unauthorized - Authentication required',
    content: {
      'application/json': { schema: ErrorSchema },
    },
  },
  [HttpStatusCodes.FORBIDDEN]: {
    description: 'Forbidden - Access denied',
    content: {
      'application/json': { schema: ErrorSchema },
    },
  },
  [HttpStatusCodes.NOT_FOUND]: {
    description: 'Not Found - Resource not found',
    content: {
      'application/json': { schema: ErrorSchema },
    },
  },
  [HttpStatusCodes.CONFLICT]: {
    description: 'Conflict - Resource already exists',
    content: {
      'application/json': { schema: ErrorSchema },
    },
  },
  [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
    description: 'Validation Error - Invalid input data',
    content: {
      'application/json': { schema: ErrorSchema },
    },
  },
  [HttpStatusCodes.REQUEST_TOO_LONG]: {
    description: 'Payload Too Large - Request entity too large',
    content: {
      'application/json': { schema: ErrorSchema },
    },
  },
  [HttpStatusCodes.INTERNAL_SERVER_ERROR]: {
    description: 'Internal Server Error - Server error occurred',
    content: {
      'application/json': { schema: ErrorSchema },
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
  status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 = 400,
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
  query: { limit: number; offset: number },
  total: number,
) {
  const pagination: PaginationInfo = {
    limit: query.limit,
    offset: query.offset,
    total,
    hasMore: query.offset + query.limit < total,
  };

  return c.json({
    data,
    pagination,
  });
}

/**
 * Creates a success response with optional metadata
 */
export function createSuccessResponse<T>(
  c: Context<ApiEnv>,
  data: T,
  message?: string,
  metadata?: Record<string, unknown>,
) {
  const response: Record<string, unknown> = { data };

  if (message) {
    response.message = message;
  }

  if (metadata) {
    response.metadata = metadata;
  }

  response.timestamp = new Date().toISOString();

  const requestId = c.get('requestId');
  if (requestId) {
    response.request_id = requestId;
  }

  return c.json(response);
}

// =============================================================================
// Business Logic Error Responses
// =============================================================================

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
};
