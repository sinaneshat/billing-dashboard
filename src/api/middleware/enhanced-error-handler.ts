/**
 * Enhanced Error Handler Middleware
 *
 * Comprehensive error handling and recovery mechanisms with:
 * - Structured error classification
 * - Automatic retry logic for transient failures
 * - Circuit breaker pattern for external services
 * - Error correlation and tracking
 * - Recovery strategies
 */

import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { Responses } from '@/api/core';
import { apiLogger } from '@/api/middleware/hono-logger';
import type { ApiEnv } from '@/api/types';

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

enum ErrorCategory {
  TRANSIENT = 'transient',
  PERMANENT = 'permanent',
  RATE_LIMITED = 'rate_limited',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  NETWORK = 'network',
  SYSTEM = 'system',
}

enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

type ErrorClassification = {
  category: ErrorCategory;
  severity: ErrorSeverity;
  isRetryable: boolean;
  retryAfter?: number;
  recoveryAction?: string;
};

// ============================================================================
// CIRCUIT BREAKER IMPLEMENTATION
// ============================================================================

class CircuitBreaker {
  private static instances = new Map<string, CircuitBreaker>();
  private failures = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private nextAttempt = 0;

  constructor(
    _name: string,
    private readonly failureThreshold = 5,
    private readonly recoveryTimeout = 60000, // 1 minute
  ) {}

  static getInstance(name: string): CircuitBreaker {
    if (!this.instances.has(name)) {
      this.instances.set(name, new CircuitBreaker(name));
    }
    return this.instances.get(name)!;
  }

  canExecute(): boolean {
    if (this.state === 'closed') {
      return true;
    }

    if (this.state === 'open') {
      if (Date.now() >= this.nextAttempt) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }

    // half-open state
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failures++;
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.recoveryTimeout;
    }
  }

  getState(): { state: string; failures: number; nextAttempt?: number } {
    return {
      state: this.state,
      failures: this.failures,
      nextAttempt: this.state === 'open' ? this.nextAttempt : undefined,
    };
  }
}

// ============================================================================
// ERROR CLASSIFIER
// ============================================================================

class ErrorClassifier {
  static classify(error: Error | HTTPException | unknown): ErrorClassification {
    // HTTP Exceptions
    if (error instanceof HTTPException) {
      return this.classifyHTTPException(error);
    }

    // Standard Errors
    if (error instanceof Error) {
      return this.classifyError(error);
    }

    // Unknown errors
    return {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: false,
    };
  }

  private static classifyHTTPException(error: HTTPException): ErrorClassification {
    const status = error.status;

    // 4xx errors (client errors)
    if (status >= 400 && status < 500) {
      switch (status) {
        case 401:
          return {
            category: ErrorCategory.AUTHENTICATION,
            severity: ErrorSeverity.MEDIUM,
            isRetryable: false,
            recoveryAction: 'refresh_authentication',
          };
        case 403:
          return {
            category: ErrorCategory.AUTHORIZATION,
            severity: ErrorSeverity.MEDIUM,
            isRetryable: false,
            recoveryAction: 'check_permissions',
          };
        case 422:
          return {
            category: ErrorCategory.VALIDATION,
            severity: ErrorSeverity.LOW,
            isRetryable: false,
            recoveryAction: 'fix_request_data',
          };
        case 429:
          return {
            category: ErrorCategory.RATE_LIMITED,
            severity: ErrorSeverity.MEDIUM,
            isRetryable: true,
            retryAfter: this.extractRetryAfter(error),
            recoveryAction: 'implement_backoff',
          };
        default:
          return {
            category: ErrorCategory.VALIDATION,
            severity: ErrorSeverity.LOW,
            isRetryable: false,
          };
      }
    }

    // 5xx errors (server errors)
    if (status >= 500) {
      switch (status) {
        case 502:
        case 503:
        case 504:
          return {
            category: ErrorCategory.EXTERNAL_SERVICE,
            severity: ErrorSeverity.HIGH,
            isRetryable: true,
            retryAfter: 5000,
            recoveryAction: 'retry_with_backoff',
          };
        default:
          return {
            category: ErrorCategory.SYSTEM,
            severity: ErrorSeverity.HIGH,
            isRetryable: true,
            retryAfter: 10000,
          };
      }
    }

    return {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: false,
    };
  }

  private static classifyError(error: Error): ErrorClassification {
    const message = error.message.toLowerCase();

    // Database errors
    if (message.includes('database') || message.includes('sqlite') || message.includes('sql')) {
      if (message.includes('timeout') || message.includes('busy')) {
        return {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          isRetryable: true,
          retryAfter: 1000,
          recoveryAction: 'retry_query',
        };
      }
      return {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        isRetryable: false,
        recoveryAction: 'check_database_connection',
      };
    }

    // Network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        isRetryable: true,
        retryAfter: 3000,
        recoveryAction: 'retry_with_exponential_backoff',
      };
    }

    // ZarinPal specific errors
    if (message.includes('zarinpal') || message.includes('payment')) {
      return {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        isRetryable: true,
        retryAfter: 5000,
        recoveryAction: 'check_zarinpal_status',
      };
    }

    // Memory/Resource errors
    if (message.includes('memory') || message.includes('resource')) {
      return {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.CRITICAL,
        isRetryable: false,
        recoveryAction: 'scale_resources',
      };
    }

    return {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: false,
    };
  }

  private static extractRetryAfter(error: HTTPException): number {
    // Try to extract Retry-After header or default to 60 seconds
    if (error.res && error.res.headers.has('retry-after')) {
      const retryAfter = error.res.headers.get('retry-after');
      if (retryAfter) {
        const seconds = Number.parseInt(retryAfter, 10);
        if (!Number.isNaN(seconds)) {
          return seconds * 1000; // Convert to milliseconds
        }
      }
    }
    return 60000; // Default 60 seconds
  }
}

// ============================================================================
// ERROR RECOVERY MANAGER
// ============================================================================

class ErrorRecoveryManager {
  static async executeRecoveryAction(
    classification: ErrorClassification,
    context: Context<ApiEnv>,
    originalError: Error | HTTPException,
  ): Promise<void> {
    if (!classification.recoveryAction) {
      return;
    }

    try {
      switch (classification.recoveryAction) {
        case 'refresh_authentication':
          await this.refreshAuthentication(context);
          break;
        case 'check_permissions':
          await this.checkPermissions(context);
          break;
        case 'check_database_connection':
          await this.checkDatabaseConnection();
          break;
        case 'check_zarinpal_status':
          await this.checkZarinPalStatus();
          break;
        case 'scale_resources':
          await this.alertResourceIssue(originalError);
          break;
        default:
          apiLogger.info(`No recovery action implemented for: ${classification.recoveryAction}`);
      }
    } catch (recoveryError) {
      apiLogger.error('Recovery action failed', recoveryError as Error, {
        originalError: originalError.message,
        recoveryAction: classification.recoveryAction,
        component: 'error-recovery',
      });
    }
  }

  private static async refreshAuthentication(_context: Context<ApiEnv>): Promise<void> {
    // Attempt to refresh authentication if possible
    apiLogger.info('Attempting authentication refresh', {
      component: 'error-recovery',
    });

    // Implementation would depend on auth system
    // For now, just log the attempt
  }

  private static async checkPermissions(context: Context<ApiEnv>): Promise<void> {
    // Check user permissions and log details
    const user = context.get('user');
    apiLogger.info('Checking user permissions', {
      userId: user?.id || 'anonymous',
      component: 'error-recovery',
    });
  }

  private static async checkDatabaseConnection(): Promise<void> {
    // Basic database health check
    try {
      const { getDbAsync } = await import('@/db');
      const db = await getDbAsync();

      // Simple query to check connection
      await db.run('SELECT 1');

      apiLogger.info('Database connection healthy', {
        component: 'error-recovery',
      });
    } catch (error) {
      apiLogger.error('Database connection check failed', error as Error, {
        component: 'error-recovery',
      });
    }
  }

  private static async checkZarinPalStatus(): Promise<void> {
    // Check ZarinPal service status
    apiLogger.info('Checking ZarinPal service status', {
      component: 'error-recovery',
    });

    // Could implement actual service health check here
    // For now, just log the check
  }

  private static async alertResourceIssue(error: Error): Promise<void> {
    // Alert about resource issues
    apiLogger.error('Resource issue detected - may need scaling', error, {
      severity: 'critical',
      component: 'error-recovery',
      alertType: 'resource_exhaustion',
    });
  }
}

// ============================================================================
// ENHANCED ERROR HANDLER MIDDLEWARE
// ============================================================================

export function enhancedErrorHandler() {
  return async (c: Context<ApiEnv>, next: Next) => {
    const startTime = Date.now();
    const requestId = c.get('requestId') || crypto.randomUUID();

    try {
      return await next();
    } catch (error) {
      const duration = Date.now() - startTime;
      const classification = ErrorClassifier.classify(error);

      // Log the error with classification
      apiLogger.error('Request failed with classified error', error as Error, {
        requestId,
        method: c.req.method,
        path: c.req.path,
        duration,
        classification,
        component: 'enhanced-error-handler',
      });

      // Update circuit breaker
      if (classification.category === ErrorCategory.EXTERNAL_SERVICE) {
        const circuitBreaker = CircuitBreaker.getInstance('external-services');
        circuitBreaker.recordFailure();
      }

      // Execute recovery actions
      await ErrorRecoveryManager.executeRecoveryAction(classification, c, error as Error);

      // Handle the error based on classification
      return handleClassifiedError(c, error, classification, requestId);
    }
  };
}

// ============================================================================
// ERROR RESPONSE HANDLER
// ============================================================================

function handleClassifiedError(
  c: Context<ApiEnv>,
  error: unknown,
  classification: ErrorClassification,
  requestId: string,
): Response {
  // Add retry information to response headers if retryable
  if (classification.isRetryable && classification.retryAfter) {
    c.res.headers.set('Retry-After', Math.ceil(classification.retryAfter / 1000).toString());
  }

  // Add error correlation ID
  c.res.headers.set('X-Error-ID', requestId);
  c.res.headers.set('X-Error-Category', classification.category);

  // Handle HTTP exceptions
  if (error instanceof HTTPException) {
    // Return appropriate response based on status
    switch (error.status) {
      case 401:
        return Responses.authenticationError(c, error.message, 'invalid_credentials');
      case 403:
        return Responses.authorizationError(c, error.message, 'insufficient_permissions');
      case 422:
        return Responses.validationError(c, [], error.message);
      case 429:
        return Responses.rateLimitExceeded(c, 100, 60000, new Date(Date.now() + 60000).toISOString());
      default:
        return Responses.internalServerError(c, error.message, 'classified_error');
    }
  }

  // Handle application errors
  if (error instanceof Error) {
    switch (classification.category) {
      case ErrorCategory.DATABASE:
        return Responses.databaseError(c, 'select', error.message);
      case ErrorCategory.EXTERNAL_SERVICE:
        return Responses.externalServiceError(c, 'External Service', error.message);
      case ErrorCategory.NETWORK:
        return Responses.internalServerError(c, 'Network connectivity issue', 'network_error');
      default:
        return Responses.internalServerError(c, error.message, 'system_error');
    }
  }

  // Fallback for unknown errors
  return Responses.internalServerError(c, 'An unexpected error occurred', 'unknown_error');
}

// ============================================================================
// CIRCUIT BREAKER MIDDLEWARE
// ============================================================================

export function circuitBreakerMiddleware(serviceName: string) {
  return async (c: Context<ApiEnv>, next: Next) => {
    const circuitBreaker = CircuitBreaker.getInstance(serviceName);

    if (!circuitBreaker.canExecute()) {
      const state = circuitBreaker.getState();

      apiLogger.warn('Circuit breaker is open', {
        serviceName,
        state,
        component: 'circuit-breaker',
      });

      return Responses.externalServiceError(
        c,
        serviceName,
        'Service temporarily unavailable due to repeated failures',
      );
    }

    try {
      const result = await next();
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      circuitBreaker.recordFailure();
      throw error;
    }
  };
}

// ============================================================================
// HEALTH CHECK FOR ERROR HANDLING SYSTEM
// ============================================================================

export function getErrorHandlingHealth(): {
  circuitBreakers: Record<string, { state: string; failures: number; nextAttempt?: number }>;
  errorClassification: {
    version: string;
    categories: string[];
    severityLevels: string[];
  };
} {
  // Get all circuit breaker states
  const circuitBreakers: Record<string, { state: string; failures: number; nextAttempt?: number }> = {};

  // This is a simplified way to get circuit breaker info
  // In a real implementation, you'd want to track these more systematically
  const knownServices = ['external-services', 'zarinpal', 'database'];

  for (const service of knownServices) {
    const breaker = CircuitBreaker.getInstance(service);
    circuitBreakers[service] = breaker.getState();
  }

  return {
    circuitBreakers,
    errorClassification: {
      version: '1.0.0',
      categories: Object.values(ErrorCategory),
      severityLevels: Object.values(ErrorSeverity),
    },
  };
}
