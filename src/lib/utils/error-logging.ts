/**
 * Structured Error Logging Utilities
 * Follows established codebase logging patterns with consistent prefixes
 */

export type ErrorLogContext = {
  userId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
};

export type LoggedError = {
  error: unknown;
  context?: ErrorLogContext;
  timestamp: string;
  severity: 'error' | 'warning' | 'info';
};

/**
 * Log errors with structured format following codebase patterns
 */
export function logStructuredError(
  _prefix: string,
  _error: unknown,
  _context?: ErrorLogContext,
  _severity: 'error' | 'warning' | 'info' = 'error',
): void {
  // Error logging removed - backend handles all error logging via Hono logger middleware
}

/**
 * Log API errors with request/response details
 */
export function logApiError(
  service: string,
  endpoint: string,
  error: unknown,
  context?: {
    statusCode?: number;
    requestPayload?: unknown;
    responseBody?: unknown;
    userId?: string;
  },
): void {
  logStructuredError(
    `${service}_API_ERROR`,
    error,
    {
      component: service,
      action: endpoint,
      metadata: context,
    },
    'error',
  );
}

/**
 * Log user-facing errors that require user action
 */
export function logUserError(
  component: string,
  action: string,
  error: unknown,
  context?: ErrorLogContext,
): void {
  logStructuredError(
    'USER_ERROR',
    error,
    {
      component,
      action,
      ...context,
    },
    'warning',
  );
}
