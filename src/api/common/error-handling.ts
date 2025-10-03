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

// Using Stoker's HttpStatusCodes for maximum reusability
import * as HttpStatusCodes from 'stoker/http-status-codes';

// Import our unified type-safe error context instead of generic Record
import type { ErrorContext } from '@/api/core';

// ============================================================================
// ERROR TYPE DEFINITIONS
// ============================================================================

/**
 * Standard error codes used throughout the application
 */
const ERROR_CODES = {
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

  // External Services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
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
  BATCH_FAILED: 'BATCH_FAILED',
  BATCH_SIZE_EXCEEDED: 'BATCH_SIZE_EXCEEDED',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Error severity levels for logging and monitoring
 */
const ERROR_SEVERITY = {
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
  public readonly context?: ErrorContext;
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
    context?: ErrorContext;
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
   * Now uses discriminated union for type safety
   */
  private sanitizeContext(): ErrorContext | undefined {
    if (!this.context)
      return undefined;

    // The discriminated union ensures type safety - no need for generic Record
    // Each error type has its own sanitization logic
    switch (this.context.errorType) {
      case 'authentication':
        return {
          ...this.context,
          attemptedEmail: this.context.attemptedEmail ? '[REDACTED]' : undefined,
        };
      default:
        return this.context;
    }
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
    context?: ErrorContext;
    correlationId?: string;
  }) {
    super({
      message,
      code,
      statusCode: HttpStatusCodes.BAD_GATEWAY,
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
  unauthenticated: (message = 'Authentication required', context?: ErrorContext, correlationId?: string) =>
    new AppError({
      message,
      code: ERROR_CODES.UNAUTHENTICATED,
      statusCode: HttpStatusCodes.UNAUTHORIZED,
      severity: ERROR_SEVERITY.MEDIUM,
      context,
      correlationId,
    }),

  unauthorized: (message = 'Insufficient permissions', context?: ErrorContext, correlationId?: string) =>
    new AppError({
      message,
      code: ERROR_CODES.UNAUTHORIZED,
      statusCode: HttpStatusCodes.FORBIDDEN,
      severity: ERROR_SEVERITY.MEDIUM,
      context,
      correlationId,
    }),

  tokenExpired: (message = 'Authentication token has expired', context?: ErrorContext, correlationId?: string) =>
    new AppError({
      message,
      code: ERROR_CODES.TOKEN_EXPIRED,
      statusCode: HttpStatusCodes.UNAUTHORIZED,
      severity: ERROR_SEVERITY.LOW,
      context,
      correlationId,
    }),

  /**
   * Resource errors
   */
  notFound: (resource = 'Resource', context?: ErrorContext, correlationId?: string) =>
    new AppError({
      message: `${resource} not found`,
      code: ERROR_CODES.RESOURCE_NOT_FOUND,
      statusCode: HttpStatusCodes.NOT_FOUND,
      severity: ERROR_SEVERITY.LOW,
      context,
      correlationId,
    }),

  alreadyExists: (resource = 'Resource', context?: ErrorContext, correlationId?: string) =>
    new AppError({
      message: `${resource} already exists`,
      code: ERROR_CODES.RESOURCE_ALREADY_EXISTS,
      statusCode: HttpStatusCodes.CONFLICT,
      severity: ERROR_SEVERITY.LOW,
      context,
      correlationId,
    }),

  conflict: (message = 'Resource conflict', context?: ErrorContext, correlationId?: string) =>
    new AppError({
      message,
      code: ERROR_CODES.RESOURCE_CONFLICT,
      statusCode: HttpStatusCodes.CONFLICT,
      severity: ERROR_SEVERITY.MEDIUM,
      context,
      correlationId,
    }),

  /**
   * Validation errors
   */
  badRequest: (message = 'Invalid request', context?: ErrorContext, correlationId?: string) =>
    new AppError({
      message,
      code: ERROR_CODES.VALIDATION_ERROR,
      statusCode: HttpStatusCodes.BAD_REQUEST,
      severity: ERROR_SEVERITY.LOW,
      context,
      correlationId,
    }),

  validation: (message = 'Validation failed', context?: ErrorContext, correlationId?: string) =>
    new AppError({
      message,
      code: ERROR_CODES.VALIDATION_ERROR,
      statusCode: HttpStatusCodes.BAD_REQUEST,
      severity: ERROR_SEVERITY.LOW,
      context,
      correlationId,
    }),

  /**
   * System errors
   */
  internal: (message = 'Internal server error', context?: ErrorContext, correlationId?: string) =>
    new AppError({
      message,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
      severity: ERROR_SEVERITY.CRITICAL,
      context,
      correlationId,
    }),

  database: (message = 'Database operation failed', context?: ErrorContext, correlationId?: string) =>
    new AppError({
      message,
      code: ERROR_CODES.DATABASE_ERROR,
      statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
      severity: ERROR_SEVERITY.CRITICAL,
      context,
      correlationId,
    }),

  rateLimit: (message = 'Too many requests', context?: ErrorContext, correlationId?: string) =>
    new AppError({
      message,
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
      severity: ERROR_SEVERITY.MEDIUM,
      context,
      correlationId,
    }),

  /**
   * External service errors
   */
  emailService: (message = 'Email service error', originalError?: Error, context?: ErrorContext, correlationId?: string) =>
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
// ERROR UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalize an unknown error value to an Error instance
 *
 * This helper ensures consistent error handling by converting any thrown value
 * into a proper Error instance. Useful in catch blocks where the error type is unknown.
 *
 * @param error - The error value to normalize (can be anything)
 * @returns A proper Error instance
 *
 * @example
 * ```typescript
 * try {
 *   await somethingDangerous();
 * } catch (error) {
 *   c.logger.error('Operation failed', normalizeError(error));
 *   throw createError.internal('Operation failed', context);
 * }
 * ```
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  AppError,
  ERROR_CODES,
  ERROR_SEVERITY,
  ExternalServiceError,
};

// ErrorCode and ErrorSeverity are already exported above where they are defined

export default createError;
