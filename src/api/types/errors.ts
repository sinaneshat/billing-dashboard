/**
 * Type-safe error context interfaces following Context7 Hono best practices
 * Replaces generic Record<string, unknown> with specific error contexts
 */

// Base error context interface
type BaseErrorContext = {
  readonly correlationId?: string;
  readonly requestId?: string;
  readonly userId?: string;
  readonly operation?: string;
  readonly timestamp?: string;
  readonly [key: string]: unknown;
};

// Authentication error contexts
export type AuthenticationErrorContext = {
  readonly type: 'authentication';
  readonly attemptedEmail?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly failureReason: 'invalid_credentials' | 'account_locked' | 'token_expired' | 'missing_token';
} & BaseErrorContext;

export type AuthorizationErrorContext = {
  readonly type: 'authorization';
  readonly requiredRole?: string;
  readonly userRole?: string;
  readonly resource?: string;
  readonly action?: string;
} & BaseErrorContext;

// Payment error contexts
export type PaymentErrorContext = {
  readonly type: 'payment';
  readonly paymentId?: string;
  readonly amount?: number;
  readonly currency?: string;
  readonly provider: 'zarinpal' | 'stripe' | 'other';
  readonly gatewayError?: string;
  readonly gatewayCode?: string;
} & BaseErrorContext;

export type InsufficientFundsErrorContext = {
  readonly type: 'insufficient_funds';
  readonly requestedAmount: number;
  readonly availableAmount?: number;
  readonly accountId?: string;
} & BaseErrorContext;

// Database error contexts
export type DatabaseErrorContext = {
  readonly type: 'database';
  readonly query?: string;
  readonly table?: string;
  readonly operation: 'select' | 'insert' | 'update' | 'delete' | 'transaction';
  readonly constraint?: string;
  readonly sqlState?: string;
} & BaseErrorContext;

// Validation error contexts
export type ValidationErrorContext = {
  readonly type: 'validation';
  readonly fieldErrors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
  readonly schemaName?: string;
} & BaseErrorContext;

// External service error contexts
export type ExternalServiceErrorContext = {
  readonly type: 'external_service';
  readonly serviceName: string;
  readonly endpoint?: string;
  readonly httpStatus?: number;
  readonly responseTime?: number;
  readonly retryAttempt?: number;
} & BaseErrorContext;

export type ZarinPalErrorContext = {
  readonly type: 'zarinpal';
  readonly authority?: string;
  readonly refId?: string;
  readonly zarinpalStatus?: number;
  readonly cardPan?: string;
} & BaseErrorContext;

export type EmailServiceErrorContext = {
  readonly type: 'email_service';
  readonly recipient?: string;
  readonly template?: string;
  readonly provider: 'ses' | 'sendgrid' | 'other';
} & BaseErrorContext;

// Resource error contexts
export type NotFoundErrorContext = {
  readonly type: 'not_found';
  readonly resource: string;
  readonly resourceId?: string;
  readonly searchCriteria?: Record<string, unknown>;
} & BaseErrorContext;

export type ConflictErrorContext = {
  readonly type: 'conflict';
  readonly resource: string;
  readonly conflictingField?: string;
  readonly existingValue?: unknown;
} & BaseErrorContext;

// System error contexts
export type RateLimitErrorContext = {
  readonly type: 'rate_limit';
  readonly limit: number;
  readonly windowMs: number;
  readonly currentCount: number;
  readonly resetTime?: string;
} & BaseErrorContext;

export type InternalErrorContext = {
  readonly type: 'internal';
  readonly component?: string;
  readonly stackTrace?: string;
  readonly memoryUsage?: number;
} & BaseErrorContext;

// Union type for all error contexts
export type ErrorContext =
  | AuthenticationErrorContext
  | AuthorizationErrorContext
  | PaymentErrorContext
  | InsufficientFundsErrorContext
  | DatabaseErrorContext
  | ValidationErrorContext
  | ExternalServiceErrorContext
  | ZarinPalErrorContext
  | EmailServiceErrorContext
  | NotFoundErrorContext
  | ConflictErrorContext
  | RateLimitErrorContext
  | InternalErrorContext;

// Type guards for error contexts
export function isAuthenticationError(context: ErrorContext): context is AuthenticationErrorContext {
  return context.type === 'authentication';
}

export function isPaymentError(context: ErrorContext): context is PaymentErrorContext {
  return context.type === 'payment';
}

export function isDatabaseError(context: ErrorContext): context is DatabaseErrorContext {
  return context.type === 'database';
}

export function isValidationError(context: ErrorContext): context is ValidationErrorContext {
  return context.type === 'validation';
}

// Error context builders
export const ErrorContextBuilders = {
  authentication: (failureReason: AuthenticationErrorContext['failureReason'], context?: Partial<AuthenticationErrorContext>): AuthenticationErrorContext => ({
    type: 'authentication',
    failureReason,
    timestamp: new Date().toISOString(),
    ...context,
  }),

  payment: (provider: PaymentErrorContext['provider'], context?: Partial<PaymentErrorContext>): PaymentErrorContext => ({
    type: 'payment',
    provider,
    timestamp: new Date().toISOString(),
    ...context,
  }),

  database: (operation: DatabaseErrorContext['operation'], context?: Partial<DatabaseErrorContext>): DatabaseErrorContext => ({
    type: 'database',
    operation,
    timestamp: new Date().toISOString(),
    ...context,
  }),

  validation: (fieldErrors: ValidationErrorContext['fieldErrors'], context?: Partial<ValidationErrorContext>): ValidationErrorContext => ({
    type: 'validation',
    fieldErrors,
    timestamp: new Date().toISOString(),
    ...context,
  }),

  notFound: (resource: string, context?: Partial<NotFoundErrorContext>): NotFoundErrorContext => ({
    type: 'not_found',
    resource,
    timestamp: new Date().toISOString(),
    ...context,
  }),
} as const;
