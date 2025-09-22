/**
 * Unified Schema System - Context7 ZOD Best Practices
 *
 * This replaces multiple validation files with a single, comprehensive,
 * type-safe schema system following official ZOD and HONO patterns.
 *
 * Features:
 * - Discriminated unions instead of Record<string, unknown>
 * - Maximum type safety and inference
 * - Reusable schema components
 * - Consistent OpenAPI documentation
 * - Single source of truth for all validations
 */

import { z } from '@hono/zod-openapi';

// ============================================================================
// CORE PRIMITIVE SCHEMAS (Context7 Pattern)
// ============================================================================

/**
 * Core field schemas with OpenAPI metadata
 * Following Context7 best practices for maximum reusability
 */
export const CoreSchemas = {
  // Identifiers
  uuid: () => z.string().uuid().openapi({
    example: 'abc123e4-5678-9012-3456-789012345678',
    description: 'UUID identifier',
  }),

  id: () => z.string().min(1).openapi({
    example: 'id_123456789',
    description: 'String identifier',
  }),

  // Text fields
  email: () => z.string().email().openapi({
    example: 'user@example.com',
    description: 'Valid email address',
  }),

  url: () => z.string().url().openapi({
    example: 'https://example.com',
    description: 'Valid URL',
  }),

  description: () => z.string().min(1).max(500).openapi({
    example: 'Product description',
    description: 'Text description (1-500 characters)',
  }),

  // Numeric fields
  amount: () => z.number().nonnegative().openapi({
    example: 99000,
    description: 'Amount in smallest currency unit (e.g., Rials)',
  }),

  positiveInt: () => z.number().int().positive().openapi({
    example: 1,
    description: 'Positive integer',
  }),

  percentage: () => z.number().min(0).max(100).openapi({
    example: 15.5,
    description: 'Percentage value (0-100)',
  }),

  // Temporal fields
  timestamp: () => z.string().datetime().openapi({
    example: new Date().toISOString(),
    description: 'ISO 8601 timestamp',
  }),

  // Pagination
  page: () => z.coerce.number().int().min(1).default(1).openapi({
    example: 1,
    description: 'Page number (1-based)',
  }),

  limit: () => z.coerce.number().int().min(1).max(100).default(20).openapi({
    example: 20,
    description: 'Results per page (max 100)',
  }),

  // Common enums
  currency: () => z.enum(['IRR', 'USD']).default('IRR').openapi({
    example: 'IRR',
    description: 'Currency code',
  }),

  sortOrder: () => z.enum(['asc', 'desc']).default('desc').openapi({
    example: 'desc',
    description: 'Sort order',
  }),

  // Status fields
  paymentStatus: () => z.enum(['pending', 'completed', 'failed', 'cancelled']).openapi({
    example: 'completed',
    description: 'Payment status',
  }),

  subscriptionStatus: () => z.enum(['pending', 'active', 'cancelled', 'suspended', 'expired']).openapi({
    example: 'active',
    description: 'Subscription status',
  }),

  billingPeriod: () => z.enum(['one_time', 'monthly', 'yearly']).openapi({
    example: 'monthly',
    description: 'Billing period',
  }),
} as const;

// ============================================================================
// IRANIAN-SPECIFIC VALIDATIONS
// ============================================================================

/**
 * Iranian national ID with checksum validation
 */
export function iranianNationalIdSchema(message?: string) {
  return z.string()
    .regex(/^\d{10}$/, 'National ID must be exactly 10 digits')
    .refine((value) => {
      // Iranian national ID checksum validation
      if (value.length !== 10 || /^(\d)\1{9}$/.test(value))
        return false;

      const digits = value.split('').map(Number);
      const checkDigit = digits.pop()!;

      let sum = 0;
      for (let i = 0; i < 9; i++) {
        const digit = digits[i];
        if (digit === undefined)
          return false;
        sum += digit * (10 - i);
      }

      const remainder = sum % 11;
      const expectedCheck = remainder < 2 ? remainder : 11 - remainder;
      return checkDigit === expectedCheck;
    }, message ?? 'Invalid Iranian national ID')
    .openapi({
      example: '0123456789',
      description: 'Valid Iranian national ID with checksum',
    });
}

/**
 * Iranian mobile phone number with normalization
 */
export function iranianMobileSchema() {
  return z.string()
    .regex(/^(\+98|0)?9\d{9}$/, 'Invalid Iranian mobile format')
    .transform((phone) => {
      // Normalize to +98 format
      if (phone.startsWith('09'))
        return `+98${phone.slice(1)}`;
      if (phone.startsWith('9'))
        return `+98${phone}`;
      if (!phone.startsWith('+98'))
        return `+98${phone}`;
      return phone;
    })
    .openapi({
      example: '+989123456789',
      description: 'Iranian mobile number (normalized to +98 format)',
    });
}

/**
 * Iranian Rial amount validation (positive integer in Rials)
 */
export function iranianRialAmountSchema() {
  return z.number()
    .int('Amount must be a whole number')
    .positive('Amount must be positive')
    .min(1000, 'Minimum amount is 1,000 Rials')
    .max(500_000_000, 'Maximum amount is 500,000,000 Rials')
    .openapi({
      example: 99000,
      description: 'Amount in Iranian Rials (1,000 - 500M)',
    });
}

// ============================================================================
// DISCRIMINATED UNION METADATA SCHEMAS (Context7 Pattern)
// ============================================================================

/**
 * Request metadata discriminated union - replaces Record<string, unknown>
 * Maximum type safety with comprehensive validation
 */
export const RequestMetadataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('api_request'),
    endpoint: z.string().min(1),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    version: z.string().regex(/^v\d+(\.\d+)?$/),
    requestId: z.string().uuid(),
    clientVersion: z.string().optional(),
    features: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal('auth_context'),
    sessionId: z.string().uuid(),
    userId: z.string().uuid(),
    role: z.enum(['user', 'admin', 'moderator']),
    permissions: z.array(z.string()),
    lastActivity: z.string().datetime(),
    ipAddress: z.string().regex(/^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$|^(?:[\da-f]{1,4}:){7}[\da-f]{1,4}$/i, 'Invalid IP address').optional(),
  }),
  z.object({
    type: z.literal('performance'),
    startTime: z.number(),
    duration: z.number().positive(),
    memoryUsage: z.number().positive(),
    dbQueries: z.number().int().nonnegative(),
    cacheHits: z.number().int().nonnegative(),
    cacheMisses: z.number().int().nonnegative(),
  }),
]).optional().openapi({
  example: {
    type: 'api_request',
    endpoint: '/api/v1/subscriptions',
    method: 'GET',
    version: 'v1',
    requestId: 'req_123456789',
  },
  description: 'Type-safe request metadata context',
});

/**
 * Logger data discriminated union - replaces Record<string, unknown> in logger methods
 * Maximum type safety for logging context data
 */
export const LoggerDataSchema = z.discriminatedUnion('logType', [
  z.object({
    logType: z.literal('operation'),
    operationName: z.string(),
    duration: z.number().optional(),
    requestId: z.string().optional(),
    userId: z.string().optional(),
    resource: z.string().optional(),
  }),
  z.object({
    logType: z.literal('performance'),
    marks: z.record(z.string(), z.number()).optional(),
    duration: z.number(),
    memoryUsage: z.number().optional(),
    dbQueries: z.number().optional(),
    cacheHits: z.number().optional(),
  }),
  z.object({
    logType: z.literal('validation'),
    fieldCount: z.number().optional(),
    schemaName: z.string().optional(),
    validationErrors: z.array(z.object({
      field: z.string(),
      message: z.string(),
      code: z.string().optional(),
    })).optional(),
  }),
  z.object({
    logType: z.literal('auth'),
    mode: z.enum(['session', 'api-key', 'session-optional', 'public']),
    userId: z.string().optional(),
    sessionId: z.string().optional(),
    ipAddress: z.string().optional(),
  }),
  z.object({
    logType: z.literal('database'),
    operation: z.enum(['select', 'insert', 'update', 'delete', 'batch']),
    table: z.string().optional(),
    affected: z.number().optional(),
    transactionId: z.string().optional(),
  }),
  z.object({
    logType: z.literal('api'),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    path: z.string(),
    statusCode: z.number().optional(),
    responseTime: z.number().optional(),
    userAgent: z.string().optional(),
  }),
  z.object({
    logType: z.literal('system'),
    component: z.string(),
    action: z.string(),
    result: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
]).optional().openapi({
  example: {
    logType: 'operation',
    operationName: 'createSubscription',
    duration: 150,
    userId: 'user_123',
  },
  description: 'Type-safe logger context data',
});

/**
 * Response metadata discriminated union - replaces Record<string, unknown> in response builders
 * Maximum type safety for response metadata
 */
export const ResponseMetadataSchema = z.discriminatedUnion('metaType', [
  z.object({
    metaType: z.literal('pagination'),
    currentPage: z.number().int().positive(),
    totalPages: z.number().int().positive(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
  z.object({
    metaType: z.literal('performance'),
    duration: z.number().positive(),
    memoryUsage: z.number().positive().optional(),
    queries: z.number().int().nonnegative().optional(),
    cacheHits: z.number().int().nonnegative().optional(),
  }),
  z.object({
    metaType: z.literal('location'),
    resourceUrl: z.string().url(),
    resourceId: z.string(),
    resourceType: z.string(),
  }),
  z.object({
    metaType: z.literal('api'),
    version: z.string(),
    endpoint: z.string(),
    deprecationNotice: z.string().optional(),
  }),
  z.object({
    metaType: z.literal('security'),
    tokenExpires: z.string().datetime().optional(),
    permissions: z.array(z.string()).optional(),
    ipAddress: z.string().optional(),
  }),
]).optional().openapi({
  example: {
    metaType: 'performance',
    duration: 150,
    memoryUsage: 1024000,
  },
  description: 'Type-safe response metadata',
});

/**
 * Error context discriminated union - replaces Record<string, unknown> in errors
 * Maximum type safety for error handling
 */
export const ErrorContextSchema = z.discriminatedUnion('errorType', [
  z.object({
    errorType: z.literal('validation'),
    fieldErrors: z.array(z.object({
      field: z.string(),
      message: z.string(),
      code: z.string().optional(),
      expected: z.string().optional(),
      received: z.string().optional(),
    })),
    schemaName: z.string().optional(),
  }),
  z.object({
    errorType: z.literal('authentication'),
    attemptedEmail: z.string().email().optional(),
    failureReason: z.enum(['invalid_credentials', 'account_locked', 'token_expired', 'missing_token']),
    ipAddress: z.string().regex(/^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$|^(?:[\da-f]{1,4}:){7}[\da-f]{1,4}$/i, 'Invalid IP address').optional(),
    userAgent: z.string().optional(),
  }),
  z.object({
    errorType: z.literal('payment'),
    paymentId: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().length(3).optional(),
    provider: z.enum(['zarinpal', 'stripe', 'other']),
    gatewayError: z.string().optional(),
    gatewayCode: z.string().optional(),
  }),
  z.object({
    errorType: z.literal('database'),
    operation: z.enum(['select', 'insert', 'update', 'delete', 'batch']),
    table: z.string().optional(),
    constraint: z.string().optional(),
    sqlState: z.string().optional(),
  }),
  z.object({
    errorType: z.literal('external_service'),
    serviceName: z.string(),
    endpoint: z.string().optional(),
    httpStatus: z.number().optional(),
    responseTime: z.number().optional(),
    retryAttempt: z.number().int().optional(),
  }),
]).optional().openapi({
  example: {
    errorType: 'payment',
    provider: 'zarinpal',
    gatewayError: 'Insufficient funds',
    gatewayCode: '101',
  },
  description: 'Type-safe error context information',
});

// ============================================================================
// BUSINESS DOMAIN SCHEMAS
// ============================================================================

/**
 * Payment method metadata discriminated union
 */
export const PaymentMethodMetadataSchema = z.discriminatedUnion('methodType', [
  z.object({
    methodType: z.literal('direct_debit_contract'),
    contractId: z.string().uuid(),
    bankAccount: z.string().min(10).max(30),
    maxAmount: z.number().positive(),
    expiresAt: z.string().datetime().optional(),
  }),
  z.object({
    methodType: z.literal('zarinpal_gateway'),
    merchantId: z.string(),
    description: z.string().max(255),
    mobile: iranianMobileSchema(),
    email: CoreSchemas.email(),
  }),
  z.object({
    methodType: z.literal('card_token'),
    tokenId: z.string(),
    lastFourDigits: z.string().length(4),
    expiryMonth: z.number().int().min(1).max(12),
    expiryYear: z.number().int().min(new Date().getFullYear()),
    cardType: z.enum(['visa', 'mastercard', 'other']),
  }),
]).openapi({
  example: {
    methodType: 'direct_debit_contract',
    contractId: 'contract_abc123',
    bankAccount: '1234567890123',
    maxAmount: 1000000,
  },
  description: 'Payment method specific metadata',
});

/**
 * Subscription metadata discriminated union
 */
export const SubscriptionMetadataSchema = z.discriminatedUnion('subscriptionType', [
  z.object({
    subscriptionType: z.literal('trial'),
    trialEnd: z.string().datetime(),
    trialDays: z.number().int().positive(),
    autoRenew: z.boolean(),
    trialFeatures: z.array(z.string()).optional(),
  }),
  z.object({
    subscriptionType: z.literal('active'),
    nextBilling: z.string().datetime(),
    autoRenew: z.boolean(),
    paymentMethodId: z.string().uuid(),
    gracePeriodDays: z.number().int().nonnegative().optional(),
  }),
  z.object({
    subscriptionType: z.literal('cancelled'),
    cancelledAt: z.string().datetime(),
    cancelReason: z.enum(['user_request', 'payment_failure', 'policy_violation']),
    refundIssued: z.boolean(),
    endOfServiceDate: z.string().datetime().optional(),
  }),
  z.object({
    subscriptionType: z.literal('plan_change_pending'),
    newProductId: z.string(),
    scheduledFor: z.string().datetime(),
    requestedAt: z.string().datetime(),
    changeType: z.enum(['upgrade', 'downgrade', 'lateral']).optional(),
    prorationCredit: z.number().nonnegative().optional(),
  }),
]).openapi({
  example: {
    subscriptionType: 'active',
    nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    autoRenew: true,
    paymentMethodId: 'pm_abc123',
  },
  description: 'Subscription lifecycle metadata',
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Success response envelope with type-safe metadata
 */
export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z.object({
      requestId: z.string().uuid().optional(),
      timestamp: z.string().datetime().optional(),
      version: z.string().optional(),
    }).optional(),
  }).openapi({
    description: 'Successful API response with type-safe data',
  });
}

/**
 * Error response schema with discriminated union context
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    context: ErrorContextSchema,
    validation: z.array(z.object({
      field: z.string(),
      message: z.string(),
      code: z.string().optional(),
    })).optional(),
  }),
  meta: z.object({
    requestId: z.string().uuid().optional(),
    timestamp: z.string().datetime().optional(),
    correlationId: z.string().optional(),
  }).optional(),
}).openapi({
  example: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      context: {
        errorType: 'validation',
        fieldErrors: [{
          field: 'email',
          message: 'Invalid email format',
        }],
      },
    },
    meta: {
      requestId: 'req_123456789',
      timestamp: new Date().toISOString(),
    },
  },
  description: 'Error response with type-safe context',
});

/**
 * Paginated response schema
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return createApiResponseSchema(z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: CoreSchemas.positiveInt(),
      limit: CoreSchemas.positiveInt(),
      total: z.number().int().nonnegative(),
      pages: CoreSchemas.positiveInt(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  })).openapi({
    description: 'Paginated response with items and pagination metadata',
  });
}

// ============================================================================
// COMMON REQUEST SCHEMAS
// ============================================================================

/**
 * Pagination query parameters
 */
export const PaginationQuerySchema = z.object({
  page: CoreSchemas.page(),
  limit: CoreSchemas.limit(),
}).openapi('PaginationQuery');

/**
 * Sorting parameters
 */
export const SortingQuerySchema = z.object({
  sortBy: z.string().min(1).optional().openapi({
    example: 'createdAt',
    description: 'Field to sort by',
  }),
  sortOrder: CoreSchemas.sortOrder(),
}).openapi('SortingQuery');

/**
 * Search parameters
 */
export const SearchQuerySchema = z.object({
  search: z.string().min(1).optional().openapi({
    example: 'search term',
    description: 'Search query string',
  }),
}).openapi('SearchQuery');

/**
 * Combined query schema for list endpoints
 */
export const ListQuerySchema = PaginationQuerySchema
  .merge(SortingQuerySchema)
  .merge(SearchQuerySchema)
  .openapi('ListQuery');

/**
 * Standard ID path parameter
 */
export const IdParamSchema = z.object({
  id: CoreSchemas.id().openapi({
    param: { name: 'id', in: 'path' },
    description: 'Resource identifier',
  }),
}).openapi('IdParam');

/**
 * UUID path parameter
 */
export const UuidParamSchema = z.object({
  id: CoreSchemas.uuid().openapi({
    param: { name: 'id', in: 'path' },
    description: 'UUID resource identifier',
  }),
}).openapi('UuidParam');

// ============================================================================
// TYPE INFERENCE AND EXPORTS
// ============================================================================

// Export all inferred types
export type RequestMetadata = z.infer<typeof RequestMetadataSchema>;
export type LoggerData = z.infer<typeof LoggerDataSchema>;
export type ResponseMetadata = z.infer<typeof ResponseMetadataSchema>;
export type ErrorContext = z.infer<typeof ErrorContextSchema>;
export type PaymentMethodMetadata = z.infer<typeof PaymentMethodMetadataSchema>;
export type SubscriptionMetadata = z.infer<typeof SubscriptionMetadataSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type SortingQuery = z.infer<typeof SortingQuerySchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type ListQuery = z.infer<typeof ListQuerySchema>;
export type IdParam = z.infer<typeof IdParamSchema>;
export type UuidParam = z.infer<typeof UuidParamSchema>;

// Export utility types
export type ApiResponse<T> = {
  success: true;
  data: T;
  meta?: {
    requestId?: string;
    timestamp?: string;
    version?: string;
  };
} | {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    context?: ErrorContext;
    validation?: Array<{ field: string; message: string; code?: string }>;
  };
  meta?: {
    requestId?: string;
    timestamp?: string;
    correlationId?: string;
  };
};

export type PaginatedResponse<T> = {
  success: true;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  meta?: {
    requestId?: string;
    timestamp?: string;
    version?: string;
  };
};
