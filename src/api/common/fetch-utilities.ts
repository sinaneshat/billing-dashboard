/**
 * Production-Ready Fetch Utilities
 *
 * Following Hono best practices from Context7 docs for robust external API calls
 * Integrates with existing service factory and error handling patterns
 */

import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { apiLogger } from '../middleware/hono-logger';
import { createError } from './error-handling';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type FetchConfig = {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelay?: number;
  backoffFactor?: number;
  retryableStatuses?: number[];
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeoutMs: number;
  };
  correlationId?: string;
};

export type RetryableError = {
  isRetryable: boolean;
  shouldCircuitBreak: boolean;
  delay: number;
};

export type FetchResult<T> = {
  success: true;
  data: T;
  response: Response;
  attempts: number;
  duration: number;
} | {
  success: false;
  error: string;
  response?: Response;
  attempts: number;
  duration: number;
};

// ============================================================================
// CIRCUIT BREAKER STATE MANAGEMENT
// ============================================================================

type CircuitBreakerState = {
  failures: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  state: 'closed' | 'open' | 'half-open';
};

const circuitBreakers = new Map<string, CircuitBreakerState>();

function getCircuitBreakerState(url: string): CircuitBreakerState {
  if (!circuitBreakers.has(url)) {
    circuitBreakers.set(url, {
      failures: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      state: 'closed',
    });
  }
  return circuitBreakers.get(url)!;
}

function updateCircuitBreakerState(
  url: string,
  success: boolean,
  config: FetchConfig,
): void {
  const state = getCircuitBreakerState(url);
  const now = Date.now();

  if (success) {
    // Reset on success
    state.failures = 0;
    state.state = 'closed';
  } else if (config.circuitBreaker) {
    state.failures++;
    state.lastFailureTime = now;

    if (state.failures >= config.circuitBreaker.failureThreshold) {
      state.state = 'open';
      state.nextAttemptTime = now + config.circuitBreaker.resetTimeoutMs;
    }
  }
}

function shouldAllowRequest(url: string, config: FetchConfig): boolean {
  if (!config.circuitBreaker)
    return true;

  const state = getCircuitBreakerState(url);
  const now = Date.now();

  switch (state.state) {
    case 'closed':
      return true;
    case 'open':
      if (now >= state.nextAttemptTime) {
        state.state = 'half-open';
        return true;
      }
      return false;
    case 'half-open':
      return true;
    default:
      return true;
  }
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

function calculateRetryDelay(attempt: number, config: FetchConfig): number {
  const baseDelay = config.retryDelay || 1000;
  const backoffFactor = config.backoffFactor || 2;
  const maxDelay = 30000; // 30 seconds max

  const delay = baseDelay * backoffFactor ** attempt;
  return Math.min(delay, maxDelay);
}

function isRetryableError(response?: Response, error?: Error): RetryableError {
  // Network errors are always retryable
  if (error && !response) {
    return { isRetryable: true, shouldCircuitBreak: true, delay: 0 };
  }

  // HTTP status code based retry logic
  if (response) {
    const retryableStatuses = [
      HttpStatusCodes.REQUEST_TIMEOUT,
      HttpStatusCodes.TOO_MANY_REQUESTS,
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
      HttpStatusCodes.BAD_GATEWAY,
      HttpStatusCodes.SERVICE_UNAVAILABLE,
      HttpStatusCodes.GATEWAY_TIMEOUT,
    ];
    const isRetryable = retryableStatuses.includes(response.status);
    const shouldCircuitBreak = response.status >= HttpStatusCodes.INTERNAL_SERVER_ERROR; // Only server errors affect circuit breaker

    // Rate limit specific delay
    const retryAfter = response.headers.get('retry-after');
    const delay = retryAfter ? Number.parseInt(retryAfter) * 1000 : 0;

    return { isRetryable, shouldCircuitBreak, delay };
  }

  return { isRetryable: false, shouldCircuitBreak: false, delay: 0 };
}

// ============================================================================
// CORE FETCH UTILITY
// ============================================================================

/**
 * Production-ready fetch utility with timeout, retries, and circuit breaker
 * Following Hono Context7 best practices for external API calls
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  init: RequestInit = {},
  config: FetchConfig = {},
): Promise<FetchResult<T>> {
  const startTime = Date.now();
  const correlationId = config.correlationId || crypto.randomUUID();
  const maxRetries = config.maxRetries || 3;
  const timeoutMs = config.timeoutMs || 30000;

  // Default configuration
  const fetchConfig: Required<FetchConfig> = {
    timeoutMs,
    maxRetries,
    retryDelay: 1000,
    backoffFactor: 2,
    retryableStatuses: [
      HttpStatusCodes.REQUEST_TIMEOUT,
      HttpStatusCodes.TOO_MANY_REQUESTS,
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
      HttpStatusCodes.BAD_GATEWAY,
      HttpStatusCodes.SERVICE_UNAVAILABLE,
      HttpStatusCodes.GATEWAY_TIMEOUT,
    ],
    circuitBreaker: config.circuitBreaker || {
      failureThreshold: 5,
      resetTimeoutMs: 60000,
    },
    correlationId,
  };

  // Circuit breaker check
  if (!shouldAllowRequest(url, fetchConfig)) {
    const duration = Date.now() - startTime;
    apiLogger.warn('Circuit breaker OPEN - request blocked', {
      url,
      correlationId,
      duration,
      component: 'fetch-utilities',
    });

    return {
      success: false,
      error: 'Circuit breaker is open',
      attempts: 0,
      duration,
    };
  }

  let lastError: Error | undefined;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create abort controller with timeout following Hono patterns
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      apiLogger.debug('Fetch attempt', {
        url,
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        correlationId,
        component: 'fetch-utilities',
      });

      // Make request with timeout
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Success case
      if (response.ok) {
        updateCircuitBreakerState(url, true, fetchConfig);

        // Parse response based on content type
        let data: T;
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          data = await response.json();
        } else if (contentType.includes('text/')) {
          data = await response.text() as T;
        } else {
          data = await response.arrayBuffer() as T;
        }

        const duration = Date.now() - startTime;

        apiLogger.info('Fetch successful', {
          url,
          status: response.status,
          attempts: attempt + 1,
          duration,
          correlationId,
          component: 'fetch-utilities',
        });

        return {
          success: true,
          data,
          response,
          attempts: attempt + 1,
          duration,
        };
      }

      // Handle error response
      lastResponse = response;
      const errorText = await response.text().catch(() => 'Unknown error');
      lastError = new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);

      // Check if should retry
      const retryInfo = isRetryableError(response);
      if (attempt === maxRetries || !retryInfo.isRetryable) {
        break;
      }

      // Calculate delay and wait
      const delay = Math.max(
        calculateRetryDelay(attempt, fetchConfig),
        retryInfo.delay,
      );

      apiLogger.warn('Fetch failed, retrying', {
        url,
        status: response.status,
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        retryDelay: delay,
        correlationId,
        component: 'fetch-utilities',
      });

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      lastError = error as Error;

      // Handle timeout and network errors
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      const isNetworkError = error instanceof Error && error.message.includes('fetch');

      if (attempt === maxRetries || (!isTimeout && !isNetworkError)) {
        break;
      }

      const delay = calculateRetryDelay(attempt, fetchConfig);

      apiLogger.warn('Fetch error, retrying', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        retryDelay: delay,
        correlationId,
        component: 'fetch-utilities',
      });

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts failed
  updateCircuitBreakerState(url, false, fetchConfig);

  const duration = Date.now() - startTime;
  const errorMessage = lastError?.message || 'Unknown error';

  apiLogger.error('Fetch failed after all retries', {
    url,
    error: errorMessage,
    attempts: maxRetries + 1,
    duration,
    correlationId,
    component: 'fetch-utilities',
  });

  return {
    success: false,
    error: errorMessage,
    response: lastResponse,
    attempts: maxRetries + 1,
    duration,
  };
}

// ============================================================================
// CONVENIENCE METHODS
// ============================================================================

/**
 * GET request with production-ready error handling
 */
export async function fetchJSON<T = unknown>(
  url: string,
  config: FetchConfig = {},
): Promise<FetchResult<T>> {
  return fetchWithRetry<T>(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'DeadPixel-BillingDashboard/1.0',
    },
  }, config);
}

/**
 * POST request with JSON body and production-ready error handling
 */
export async function postJSON<T = unknown>(
  url: string,
  body: unknown,
  config: FetchConfig = {},
  headers: Record<string, string> = {},
): Promise<FetchResult<T>> {
  return fetchWithRetry<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'DeadPixel-BillingDashboard/1.0',
      ...headers, // Custom headers override defaults
    },
    body: JSON.stringify(body),
  }, config);
}

/**
 * Create HTTPException from fetch result for consistent error handling
 * Integrates with existing Hono error patterns
 */
export function createHTTPExceptionFromFetchResult(
  result: FetchResult<unknown>,
  operation: string,
): HTTPException {
  if (result.success) {
    throw new Error('Cannot create exception from successful result');
  }

  const status = result.response?.status || HttpStatusCodes.SERVICE_UNAVAILABLE;
  const message = `${operation} failed: ${result.error}`;

  // Map status codes to valid HTTPException status codes
  const statusCodeMap: Record<number, typeof HttpStatusCodes.BAD_REQUEST | typeof HttpStatusCodes.UNAUTHORIZED | typeof HttpStatusCodes.FORBIDDEN | typeof HttpStatusCodes.NOT_FOUND | typeof HttpStatusCodes.METHOD_NOT_ALLOWED | typeof HttpStatusCodes.REQUEST_TIMEOUT | typeof HttpStatusCodes.CONFLICT | typeof HttpStatusCodes.UNPROCESSABLE_ENTITY | typeof HttpStatusCodes.TOO_MANY_REQUESTS | typeof HttpStatusCodes.INTERNAL_SERVER_ERROR | typeof HttpStatusCodes.BAD_GATEWAY | typeof HttpStatusCodes.SERVICE_UNAVAILABLE | typeof HttpStatusCodes.GATEWAY_TIMEOUT> = {
    400: HttpStatusCodes.BAD_REQUEST,
    401: HttpStatusCodes.UNAUTHORIZED,
    403: HttpStatusCodes.FORBIDDEN,
    404: HttpStatusCodes.NOT_FOUND,
    405: HttpStatusCodes.METHOD_NOT_ALLOWED,
    408: HttpStatusCodes.REQUEST_TIMEOUT,
    409: HttpStatusCodes.CONFLICT,
    422: HttpStatusCodes.UNPROCESSABLE_ENTITY,
    429: HttpStatusCodes.TOO_MANY_REQUESTS,
    500: HttpStatusCodes.INTERNAL_SERVER_ERROR,
    502: HttpStatusCodes.BAD_GATEWAY,
    503: HttpStatusCodes.SERVICE_UNAVAILABLE,
    504: HttpStatusCodes.GATEWAY_TIMEOUT,
  };

  const mappedStatus = statusCodeMap[status];
  if (mappedStatus) {
    return new HTTPException(mappedStatus, { message });
  }

  // Default to 503 for non-HTTP errors
  return new HTTPException(HttpStatusCodes.SERVICE_UNAVAILABLE, { message });
}

/**
 * Environment variable validation following Hono patterns
 */
export function validateEnvironmentVariables(
  env: Record<string, unknown>,
  required: string[],
): void {
  const missing = required.filter(key => !env[key]);

  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}`;
    apiLogger.error('Environment validation failed', {
      missing,
      component: 'fetch-utilities',
    });

    throw createError.internal(errorMessage);
  }
}
