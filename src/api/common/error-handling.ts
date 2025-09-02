/**
 * Standardized Error Handling Patterns for API Routes
 *
 * This module provides comprehensive, standardized error handling patterns
 * across all API routes with consistent error formatting, logging, and
 * response structures.
 *
 * Features:
 * - Standardized error types and codes
 * - Consistent error response formatting
 * - Proper error logging without sensitive data
 * - HTTP status code mapping
 * - Error context and metadata handling
 * - Request tracing and correlation IDs
 */

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import { apiLogger } from '@/api/middleware/hono-logger';

import { formatZodError, zodValidation } from './zod-validation-utils';

// ============================================================================
// ERROR TYPE DEFINITIONS
// ============================================================================

/**
 * Standard error codes used throughout the application
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation & Input
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_ENUM_VALUE: 'INVALID_ENUM_VALUE',

  // Resource Management
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',
  RESOURCE_EXPIRED: 'RESOURCE_EXPIRED',

  // Business Logic
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  SUBSCRIPTION_INACTIVE: 'SUBSCRIPTION_INACTIVE',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  PAYMENT_METHOD_INVALID: 'PAYMENT_METHOD_INVALID',
  CONTRACT_NOT_ACTIVE: 'CONTRACT_NOT_ACTIVE',

  // External Services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  PAYMENT_GATEWAY_ERROR: 'PAYMENT_GATEWAY_ERROR',
  ZARINPAL_ERROR: 'ZARINPAL_ERROR',
  EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR',
  STORAGE_SERVICE_ERROR: 'STORAGE_SERVICE_ERROR',

  // System & Infrastructure
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * HTTP status codes mapping to error types
 */
export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Error severity levels for logging and monitoring
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type ErrorSeverity = typeof ERROR_SEVERITY[keyof typeof ERROR_SEVERITY];

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base application error class with enhanced metadata
 */
class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly details?: unknown;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly correlationId?: string;

  constructor({
    message,
    code,
    statusCode,
    severity = ERROR_SEVERITY.MEDIUM,
    details,
    context,
    correlationId,
  }: {
    message: string;
    code: ErrorCode;
    statusCode: number;
    severity?: ErrorSeverity;
    details?: unknown;
    context?: Record<string, unknown>;
    correlationId?: string;
  }) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.details = details;
    this.context = context;
    this.timestamp = new Date();
    this.correlationId = correlationId;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      severity: this.severity,
      details: this.details,
      context: this.sanitizeContext(),
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
      stack: this.stack,
    };
  }

  /**
   * Remove sensitive data from context for logging
   */
  private sanitizeContext(): Record<string, unknown> | undefined {
    if (!this.context)
      return undefined;

    const sanitized = { ...this.context };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];

    Object.keys(sanitized).forEach((key) => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

/**
 * Validation error class for input validation failures
 */
class ValidationError extends AppError {
  public readonly validationErrors: Array<{ field: string; message: string }>;

  constructor({
    message = 'Validation failed',
    validationErrors,
    context,
    correlationId,
  }: {
    message?: string;
    validationErrors: Array<{ field: string; message: string }>;
    context?: Record<string, unknown>;
    correlationId?: string;
  }) {
    super({
      message,
      code: ERROR_CODES.VALIDATION_ERROR,
      statusCode: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
      severity: ERROR_SEVERITY.LOW,
      details: { validationErrors },
      context,
      correlationId,
    });

    this.validationErrors = validationErrors;
  }

  static fromZodError(
    error: z.ZodError,
    context?: Record<string, unknown>,
    correlationId?: string,
  ): ValidationError {
    return new ValidationError({
      validationErrors: formatZodError(error),
      context,
      correlationId,
    });
  }
}

/**
 * Business logic error class for domain-specific errors
 */
class BusinessLogicError extends AppError {
  constructor({
    message,
    code,
    severity = ERROR_SEVERITY.MEDIUM,
    details,
    context,
    correlationId,
  }: {
    message: string;
    code: ErrorCode;
    severity?: ErrorSeverity;
    details?: unknown;
    context?: Record<string, unknown>;
    correlationId?: string;
  }) {
    super({
      message,
      code,
      statusCode: HTTP_STATUS_CODES.BAD_REQUEST,
      severity,
      details,
      context,
      correlationId,
    });
  }
}

/**
 * External service error class for third-party service failures
 */
class ExternalServiceError extends AppError {
  public readonly serviceName: string;
  public readonly originalError?: Error;

  constructor({
    message,
    serviceName,
    code = ERROR_CODES.EXTERNAL_SERVICE_ERROR,
    originalError,
    context,
    correlationId,
  }: {
    message: string;
    serviceName: string;
    code?: ErrorCode;
    originalError?: Error;
    context?: Record<string, unknown>;
    correlationId?: string;
  }) {
    super({
      message,
      code,
      statusCode: HTTP_STATUS_CODES.BAD_GATEWAY,
      severity: ERROR_SEVERITY.HIGH,
      details: {
        serviceName,
        originalError: originalError?.message,
      },
      context,
      correlationId,
    });

    this.serviceName = serviceName;
    this.originalError = originalError;
  }
}

// ============================================================================
// ERROR FACTORY FUNCTIONS
// ============================================================================

/**
 * Factory functions for creating common errors
 */
export const createError = {
  /**
   * Authentication errors
   */
  unauthenticated: (message = 'Authentication required', context?: Record<string, unknown>, correlationId?: string) =>
    new AppError({
      message,
      code: ERROR_CODES.UNAUTHENTICATED,
      statusCode: HTTP_STATUS_CODES.UNAUTHORIZED,
      severity: ERROR_SEVERITY.MEDIUM,
      context,
      correlationId,
    }),

  unauthorized: (message = 'Insufficient permissions', context?: Record<string, unknown>, correlationId?: string) =>
    new AppError({
      message,
      code: ERROR_CODES.UNAUTHORIZED,
      statusCode: HTTP_STATUS_CODES.FORBIDDEN,
      severity: ERROR_SEVERITY.MEDIUM,
      context,
      correlationId,
    }),

  tokenExpired: (message = 'Authentication token has expired', context?: Record<string, unknown>, correlationId?: string) =>
    new AppError({
      message,
      code: ERROR_CODES.TOKEN_EXPIRED,
      statusCode: HTTP_STATUS_CODES.UNAUTHORIZED,
      severity: ERROR_SEVERITY.LOW,
      context,
      correlationId,
    }),

  /**
   * Resource errors
   */
  notFound: (resource = 'Resource', context?: Record<string, unknown>, correlationId?: string) =>
    new AppError({
      message: `${resource} not found`,
      code: ERROR_CODES.RESOURCE_NOT_FOUND,
      statusCode: HTTP_STATUS_CODES.NOT_FOUND,
      severity: ERROR_SEVERITY.LOW,
      context,
      correlationId,
    }),

  alreadyExists: (resource = 'Resource', context?: Record<string, unknown>, correlationId?: string) =>
    new AppError({
      message: `${resource} already exists`,
      code: ERROR_CODES.RESOURCE_ALREADY_EXISTS,
      statusCode: HTTP_STATUS_CODES.CONFLICT,
      severity: ERROR_SEVERITY.LOW,
      context,
      correlationId,
    }),

  conflict: (message = 'Resource conflict', context?: Record<string, unknown>, correlationId?: string) =>
    new AppError({
      message,
      code: ERROR_CODES.RESOURCE_CONFLICT,
      statusCode: HTTP_STATUS_CODES.CONFLICT,
      severity: ERROR_SEVERITY.MEDIUM,
      context,
      correlationId,
    }),

  /**
   * Payment errors
   */
  paymentFailed: (message = 'Payment processing failed', context?: Record<string, unknown>, correlationId?: string) =>
    new BusinessLogicError({
      message,
      code: ERROR_CODES.PAYMENT_FAILED,
      severity: ERROR_SEVERITY.HIGH,
      context,
      correlationId,
    }),

  insufficientFunds: (message = 'Insufficient funds for transaction', context?: Record<string, unknown>, correlationId?: string) =>
    new BusinessLogicError({
      message,
      code: ERROR_CODES.INSUFFICIENT_FUNDS,
      severity: ERROR_SEVERITY.MEDIUM,
      context,
      correlationId,
    }),

  paymentMethodInvalid: (message = 'Payment method is invalid or inactive', context?: Record<string, unknown>, correlationId?: string) =>
    new BusinessLogicError({
      message,
      code: ERROR_CODES.PAYMENT_METHOD_INVALID,
      severity: ERROR_SEVERITY.MEDIUM,
      context,
      correlationId,
    }),

  /**
   * System errors
   */
  internal: (message = 'Internal server error', context?: Record<string, unknown>, correlationId?: string) =>
    new AppError({
      message,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      statusCode: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
      severity: ERROR_SEVERITY.CRITICAL,
      context,
      correlationId,
    }),

  database: (message = 'Database operation failed', context?: Record<string, unknown>, correlationId?: string) =>
    new AppError({
      message,
      code: ERROR_CODES.DATABASE_ERROR,
      statusCode: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
      severity: ERROR_SEVERITY.CRITICAL,
      context,
      correlationId,
    }),

  rateLimit: (message = 'Too many requests', context?: Record<string, unknown>, correlationId?: string) =>
    new AppError({
      message,
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      statusCode: HTTP_STATUS_CODES.TOO_MANY_REQUESTS,
      severity: ERROR_SEVERITY.MEDIUM,
      context,
      correlationId,
    }),

  /**
   * External service errors
   */
  zarinpal: (message = 'ZarinPal service error', originalError?: Error, context?: Record<string, unknown>, correlationId?: string) =>
    new ExternalServiceError({
      message,
      serviceName: 'ZarinPal',
      code: ERROR_CODES.ZARINPAL_ERROR,
      originalError,
      context,
      correlationId,
    }),

  emailService: (message = 'Email service error', originalError?: Error, context?: Record<string, unknown>, correlationId?: string) =>
    new ExternalServiceError({
      message,
      serviceName: 'Email',
      code: ERROR_CODES.EMAIL_SERVICE_ERROR,
      originalError,
      context,
      correlationId,
    }),
};

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Get correlation ID from Hono context
 */
export function getCorrelationId(c: Context): string {
  return c.get('correlationId') || c.req.header('x-correlation-id') || generateCorrelationId();
}

/**
 * Generate a unique correlation ID
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract request context for error logging
 */
export function extractRequestContext(c: Context): Record<string, unknown> {
  const user = c.get('user');
  const requestId = c.get('requestId');

  return {
    method: c.req.method,
    path: c.req.path,
    userAgent: c.req.header('user-agent'),
    ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for'),
    userId: user?.id,
    requestId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Convert any error to AppError
 */
export function normalizeError(error: unknown, context?: Record<string, unknown>, correlationId?: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof HTTPException) {
    return new AppError({
      message: error.message,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      statusCode: error.status,
      context,
      correlationId,
    });
  }

  if (error instanceof z.ZodError) {
    return ValidationError.fromZodError(error, context, correlationId);
  }

  if (error instanceof Error) {
    return new AppError({
      message: error.message,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      statusCode: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
      severity: ERROR_SEVERITY.CRITICAL,
      context: {
        ...context,
        originalErrorName: error.name,
        stack: error.stack,
      },
      correlationId,
    });
  }

  return new AppError({
    message: 'Unknown error occurred',
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    statusCode: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    severity: ERROR_SEVERITY.CRITICAL,
    context: {
      ...context,
      originalError: String(error),
    },
    correlationId,
  });
}

/**
 * Safe error logging without sensitive data
 */
export function logError(error: AppError, additionalContext?: Record<string, unknown>): void {
  const logData = {
    ...error.toJSON(),
    ...additionalContext,
  };

  // Log based on severity
  switch (error.severity) {
    case ERROR_SEVERITY.LOW:
      apiLogger.info('API Error (Low)', { data: logData });
      break;
    case ERROR_SEVERITY.MEDIUM:
      apiLogger.warn('API Error (Medium)', { data: logData });
      break;
    case ERROR_SEVERITY.HIGH:
      apiLogger.error('API Error (High)', { data: logData });
      break;
    case ERROR_SEVERITY.CRITICAL:
      apiLogger.error('API Error (CRITICAL)', { data: logData });
      // In production, you might want to send alerts here
      break;
  }
}

// ============================================================================
// ERROR RESPONSE FORMATTING
// ============================================================================

/**
 * Standard error response schema
 */
export const errorResponseSchema = zodValidation.apiErrorResponseSchema;

/**
 * Format error for API response
 */
export function formatErrorResponse(error: AppError) {
  const response = {
    success: false as const,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      ...(error instanceof ValidationError && {
        validation: error.validationErrors,
      }),
    },
    meta: {
      correlationId: error.correlationId,
      timestamp: error.timestamp.toISOString(),
    },
  };

  // Validate the response format
  const validation = errorResponseSchema.safeParse(response);
  if (!validation.success) {
    apiLogger.error('Error response format validation failed', { error: validation.error });
    // Return a safe fallback response
    return {
      success: false as const,
      error: {
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      },
      meta: {
        correlationId: error.correlationId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  return response;
}

/**
 * Handle and format error for Hono response
 */
export function handleError(c: Context, error: unknown): Response {
  const correlationId = getCorrelationId(c);
  const context = extractRequestContext(c);
  const normalizedError = normalizeError(error, context, correlationId);

  // Log the error
  logError(normalizedError);

  // Format response
  const errorResponse = formatErrorResponse(normalizedError);

  return c.json(errorResponse, normalizedError.statusCode as never);
}

// ============================================================================
// MIDDLEWARE FOR ERROR HANDLING
// ============================================================================

/**
 * Global error handling middleware for Hono
 */
export function errorHandlingMiddleware() {
  return async (c: Context, next: () => Promise<void>): Promise<Response> => {
    try {
      await next();
      // If no error occurred and no response was set, return an empty response
      return new Response(null, { status: 200 });
    } catch (error) {
      return handleError(c, error);
    }
  };
}

/**
 * Correlation ID middleware
 */
function correlationIdMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    const correlationId = c.req.header('x-correlation-id') || generateCorrelationId();
    c.set('correlationId', correlationId);
    c.header('x-correlation-id', correlationId);
    await next();
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  AppError,
  BusinessLogicError,
  ExternalServiceError,
  HTTP_STATUS_CODES as HttpStatusCodes,
  ValidationError,
};

// ErrorCode and ErrorSeverity are already exported above where they are defined

export default {
  ERROR_CODES,
  ERROR_SEVERITY,
  HTTP_STATUS_CODES,
  createError,
  normalizeError,
  handleError,
  formatErrorResponse,
  logError,
  getCorrelationId,
  extractRequestContext,
  errorHandlingMiddleware,
  correlationIdMiddleware,
};
