/**
 * Service Factory Pattern
 *
 * Provides standardized service abstraction with consistent error handling,
 * configuration management, and type safety across all external services.
 *
 * Features:
 * - Type-safe service configuration
 * - Standardized error handling
 * - Automatic retry mechanisms
 * - Circuit breaker pattern
 * - Request/response logging
 * - Performance monitoring
 */

import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { ExternalServiceError } from '@/api/common/error-handling';
import type { FetchConfig } from '@/api/common/fetch-utilities';
import {
  createHTTPExceptionFromFetchResult,
  fetchJSON,
  fetchWithRetry,
  postJSON,
} from '@/api/common/fetch-utilities';
import { apiLogger } from '@/api/middleware/hono-logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ServiceConfig = {
  serviceName: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeout: number;
  };
};

// RetryConfig is now handled by fetch utilities

export type CircuitBreakerState = {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime: number;
  nextAttempt: number;
};

// ============================================================================
// BASE SERVICE CLASS
// ============================================================================

export abstract class BaseService<TConfig extends ServiceConfig> {
  protected readonly config: TConfig;
  private circuitBreakerState: CircuitBreakerState;

  constructor(config: TConfig) {
    this.config = config;
    this.circuitBreakerState = {
      state: 'closed',
      failures: 0,
      lastFailureTime: 0,
      nextAttempt: 0,
    };
  }

  /**
   * Factory method to create service instance with environment validation
   */
  static create<T extends BaseService<TConfig>, TConfig extends ServiceConfig>(
    this: (new (config: TConfig) => T) & { getConfig: (env: CloudflareEnv) => TConfig },
    env: CloudflareEnv,
  ): T {
    const config = this.getConfig(env);
    return new this(config);
  }

  /**
   * Abstract method to get service configuration from environment
   * Must be implemented by each service
   */
  protected static getConfig(_env: CloudflareEnv): ServiceConfig {
    throw new Error('getConfig must be implemented by service');
  }

  // ============================================================================
  // HTTP REQUEST METHODS
  // ============================================================================

  /**
   * Make HTTP request with production-ready error handling, timeouts, and retries
   * Integrates with advanced fetch utilities and circuit breaker patterns
   */
  protected async makeRequest<TResponse = unknown>(
    url: string,
    options: RequestInit = {},
    operationName = 'request',
  ): Promise<TResponse> {
    // Check circuit breaker before making request
    this.checkCircuitBreaker();

    const fullUrl = this.config.baseUrl ? `${this.config.baseUrl}${url}` : url;
    const logger = this.createOperationLogger(operationName);

    // Configure production-ready fetch with circuit breaker integration
    const fetchConfig: FetchConfig = {
      timeoutMs: this.config.timeout || 30000,
      maxRetries: this.config.retries || 3,
      correlationId: crypto.randomUUID(),
      circuitBreaker: this.config.circuitBreaker
        ? {
            failureThreshold: this.config.circuitBreaker.failureThreshold,
            resetTimeoutMs: this.config.circuitBreaker.resetTimeout,
          }
        : undefined,
    };

    logger.debug('Making production-ready HTTP request', {
      url: fullUrl,
      method: options.method || 'GET',
      timeout: fetchConfig.timeoutMs,
      maxRetries: fetchConfig.maxRetries,
    });

    try {
      // Use production-ready fetch utilities
      const fetchResult = await fetchWithRetry<TResponse>(fullUrl, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `API-Client/${this.config.serviceName}/1.0`,
          ...options.headers,
        },
        body: options.body,
      }, fetchConfig);

      if (!fetchResult.success) {
        // Record failure for circuit breaker
        this.recordFailure();
        throw createHTTPExceptionFromFetchResult(fetchResult, operationName);
      }

      // Record success for circuit breaker
      this.recordSuccess();

      logger.info('HTTP request successful', {
        url: fullUrl,
        attempts: fetchResult.attempts,
        duration: fetchResult.duration,
      });

      return fetchResult.data;
    } catch (error) {
      // Record failure for circuit breaker
      this.recordFailure();

      logger.error('HTTP request failed', error as Error, {
        url: fullUrl,
        operationName,
      });

      throw this.handleError(error, operationName, { url: fullUrl });
    }
  }

  /**
   * Make GET request with production-ready fetch utilities
   */
  protected async get<TResponse = unknown>(
    url: string,
    headers?: Record<string, string>,
    operationName = 'GET',
  ): Promise<TResponse> {
    const fullUrl = this.config.baseUrl ? `${this.config.baseUrl}${url}` : url;
    const fetchConfig = this.createFetchConfig();

    const fetchResult = await fetchJSON<TResponse>(fullUrl, fetchConfig);

    if (!fetchResult.success) {
      this.recordFailure();
      throw createHTTPExceptionFromFetchResult(fetchResult, operationName);
    }

    this.recordSuccess();
    return fetchResult.data;
  }

  /**
   * Make POST request with production-ready fetch utilities
   */
  protected async post<TRequest = unknown, TResponse = unknown>(
    url: string,
    body?: TRequest,
    headers?: Record<string, string>,
    operationName = 'POST',
  ): Promise<TResponse> {
    const fullUrl = this.config.baseUrl ? `${this.config.baseUrl}${url}` : url;
    const fetchConfig = this.createFetchConfig();

    const fetchResult = await postJSON<TResponse>(
      fullUrl,
      body,
      fetchConfig,
      {
        'User-Agent': `API-Client/${this.config.serviceName}/1.0`,
        ...headers,
      },
    );

    if (!fetchResult.success) {
      this.recordFailure();
      throw createHTTPExceptionFromFetchResult(fetchResult, operationName);
    }

    this.recordSuccess();
    return fetchResult.data;
  }

  /**
   * Make PUT request with production-ready fetch utilities
   */
  protected async put<TRequest = unknown, TResponse = unknown>(
    url: string,
    body?: TRequest,
    headers?: Record<string, string>,
    operationName = 'PUT',
  ): Promise<TResponse> {
    const fullUrl = this.config.baseUrl ? `${this.config.baseUrl}${url}` : url;
    const fetchConfig = this.createFetchConfig();

    const fetchResult = await fetchWithRetry<TResponse>(
      fullUrl,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `API-Client/${this.config.serviceName}/1.0`,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      },
      fetchConfig,
    );

    if (!fetchResult.success) {
      this.recordFailure();
      throw createHTTPExceptionFromFetchResult(fetchResult, operationName);
    }

    this.recordSuccess();
    return fetchResult.data;
  }

  /**
   * Make DELETE request with production-ready fetch utilities
   */
  protected async delete<TResponse = unknown>(
    url: string,
    headers?: Record<string, string>,
    operationName = 'DELETE',
  ): Promise<TResponse> {
    const fullUrl = this.config.baseUrl ? `${this.config.baseUrl}${url}` : url;
    const fetchConfig = this.createFetchConfig();

    const fetchResult = await fetchWithRetry<TResponse>(
      fullUrl,
      {
        method: 'DELETE',
        headers: {
          'User-Agent': `API-Client/${this.config.serviceName}/1.0`,
          ...headers,
        },
      },
      fetchConfig,
    );

    if (!fetchResult.success) {
      this.recordFailure();
      throw createHTTPExceptionFromFetchResult(fetchResult, operationName);
    }

    this.recordSuccess();
    return fetchResult.data;
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  // HTTP error handling is now managed by fetch utilities

  /**
   * Handle general errors with context
   */
  protected handleError(
    error: unknown,
    operationName: string,
    context?: Record<string, unknown>,
  ): ExternalServiceError {
    if (error instanceof HTTPException) {
      throw error;
    }

    if (error instanceof ExternalServiceError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    return new ExternalServiceError({
      message: `${this.config.serviceName} ${operationName} failed: ${errorMessage}`,
      serviceName: this.config.serviceName,
      originalError: error instanceof Error ? error : new Error(errorMessage),
      context,
    });
  }

  // ============================================================================
  // FETCH CONFIGURATION
  // ============================================================================

  /**
   * Create fetch configuration with service-specific settings
   */
  private createFetchConfig(): FetchConfig {
    return {
      timeoutMs: this.config.timeout || 30000,
      maxRetries: this.config.retries || 3,
      correlationId: crypto.randomUUID(),
      circuitBreaker: this.config.circuitBreaker
        ? {
            failureThreshold: this.config.circuitBreaker.failureThreshold,
            resetTimeoutMs: this.config.circuitBreaker.resetTimeout,
          }
        : undefined,
    };
  }

  // ============================================================================
  // CIRCUIT BREAKER
  // ============================================================================

  /**
   * Check circuit breaker state before making request
   */
  private checkCircuitBreaker(): void {
    if (!this.config.circuitBreaker)
      return;

    const now = Date.now();
    const { state, nextAttempt } = this.circuitBreakerState;

    switch (state) {
      case 'open':
        if (now >= nextAttempt) {
          this.circuitBreakerState.state = 'half-open';
          apiLogger.info('Circuit breaker transitioning to half-open', {
            service: this.config.serviceName,
          });
        } else {
          throw new HTTPException(HttpStatusCodes.SERVICE_UNAVAILABLE, {
            message: `${this.config.serviceName} service is currently unavailable (circuit breaker open)`,
          });
        }
        break;
      case 'half-open':
        // Allow one request to test service health
        break;
      case 'closed':
        // Normal operation
        break;
    }
  }

  /**
   * Record successful operation for circuit breaker
   */
  private recordSuccess(): void {
    if (!this.config.circuitBreaker)
      return;

    if (this.circuitBreakerState.state === 'half-open') {
      this.circuitBreakerState.state = 'closed';
      this.circuitBreakerState.failures = 0;
      apiLogger.info('Circuit breaker closed (service recovered)', {
        service: this.config.serviceName,
      });
    }
  }

  /**
   * Record failed operation for circuit breaker
   */
  private recordFailure(): void {
    if (!this.config.circuitBreaker)
      return;

    this.circuitBreakerState.failures++;
    this.circuitBreakerState.lastFailureTime = Date.now();

    const { failureThreshold, resetTimeout } = this.config.circuitBreaker;

    if (
      this.circuitBreakerState.failures >= failureThreshold
      && this.circuitBreakerState.state === 'closed'
    ) {
      this.circuitBreakerState.state = 'open';
      this.circuitBreakerState.nextAttempt = Date.now() + resetTimeout;

      apiLogger.warn('Circuit breaker opened due to failures', {
        service: this.config.serviceName,
        failures: this.circuitBreakerState.failures,
        threshold: failureThreshold,
        resetIn: resetTimeout,
      });
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Create operation-specific logger
   */
  protected createOperationLogger(operationName: string) {
    return {
      debug: (message: string, data?: Record<string, unknown>) => {
        apiLogger.debug(`${this.config.serviceName}:${operationName}: ${message}`, {
          service: this.config.serviceName,
          operation: operationName,
          ...data,
        });
      },
      info: (message: string, data?: Record<string, unknown>) => {
        apiLogger.info(`${this.config.serviceName}:${operationName}: ${message}`, {
          service: this.config.serviceName,
          operation: operationName,
          ...data,
        });
      },
      warn: (message: string, data?: Record<string, unknown>) => {
        apiLogger.warn(`${this.config.serviceName}:${operationName}: ${message}`, {
          service: this.config.serviceName,
          operation: operationName,
          ...data,
        });
      },
      error: (message: string, error?: Error, data?: Record<string, unknown>) => {
        apiLogger.error(`${this.config.serviceName}:${operationName}: ${message}`, {
          service: this.config.serviceName,
          operation: operationName,
          error,
          ...data,
        });
      },
    };
  }

  /**
   * Get comprehensive service health status including fetch utility metrics
   */
  getHealthStatus(): {
    serviceName: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    circuitBreaker: CircuitBreakerState;
    uptime: number;
    configuration: {
      timeout: number;
      retries: number;
      circuitBreakerEnabled: boolean;
    };
  } {
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (this.circuitBreakerState.state === 'open') {
      status = 'unhealthy';
    } else if (this.circuitBreakerState.state === 'half-open') {
      status = 'degraded';
    }

    return {
      serviceName: this.config.serviceName,
      status,
      circuitBreaker: this.circuitBreakerState,
      uptime: Date.now() - (this.circuitBreakerState.lastFailureTime || Date.now()),
      configuration: {
        timeout: this.config.timeout || 30000,
        retries: this.config.retries || 3,
        circuitBreakerEnabled: !!this.config.circuitBreaker,
      },
    };
  }
}
