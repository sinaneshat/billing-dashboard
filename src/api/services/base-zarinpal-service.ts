/**
 * Base ZarinPal Service
 *
 * Shared functionality for all ZarinPal API integrations.
 * Provides common HTTP methods, error handling, and configuration patterns.
 * Extended by ZarinPalService and ZarinPalDirectDebitService.
 */

import { z } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';

import { HTTPExceptionFactory } from '@/api/core/http-exceptions';
import type { ApiEnv } from '@/api/types';

// =============================================================================
// BASE CONFIGURATION SCHEMA
// =============================================================================

export const BaseZarinPalConfigSchema = z.object({
  merchantId: z.string().regex(/^[a-f0-9-]{36}$/, 'Invalid ZarinPal merchant ID format'),
  sandboxMode: z.boolean().default(false),
  timeout: z.number().default(30000),
  sandbox: z.object({
    baseUrl: z.string().url(),
    merchantId: z.string(),
  }),
  production: z.object({
    baseUrl: z.string().url(),
  }),
});

export type BaseZarinPalConfig = z.infer<typeof BaseZarinPalConfigSchema>;

// =============================================================================
// ABSTRACT BASE ZARINPAL SERVICE
// =============================================================================

export abstract class BaseZarinPalService {
  protected config: BaseZarinPalConfig;
  protected env: ApiEnv | null = null;

  constructor(config: BaseZarinPalConfig, env?: ApiEnv) {
    this.config = config;
    this.env = env || null;
  }

  /**
   * Get authorization header for authenticated endpoints
   * Shared by both regular payments and direct debit services
   */
  protected getAuthorizationHeader(): string {
    // Both production and sandbox use merchant ID for auth
    const merchantId = this.config.sandboxMode
      ? this.config.sandbox.merchantId
      : this.config.merchantId;
    return `Bearer ${merchantId}`;
  }

  /**
   * Make authenticated POST request
   * Shared method for all ZarinPal POST operations
   */
  protected async post<TRequest, TResponse>(
    endpoint: string,
    data: TRequest,
    requiresAuth = true,
  ): Promise<TResponse> {
    const baseUrl = this.config.sandboxMode
      ? this.config.sandbox.baseUrl
      : this.config.production.baseUrl;
    const url = `${baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (requiresAuth) {
      headers.Authorization = this.getAuthorizationHeader();
    }

    return this.makeRequest<TResponse>(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
  }

  /**
   * Make HTTP request with enhanced error handling
   * Uses the enhanced version from direct-debit service with HTTP 422 handling
   */
  protected async makeRequest<T>(url: string, options: RequestInit): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Enhanced error handling for various HTTP status codes
      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails: Record<string, unknown> | string | null = null;

        try {
          const errorJson = JSON.parse(errorBody);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
          if (errorJson.errors) {
            errorDetails = errorJson.errors;
          }
        } catch {
          // If body is not JSON, use it as is
          if (errorBody) {
            errorMessage = errorBody;
          }
        }

        // Special handling for HTTP 422 (Unprocessable Entity)
        if (response.status === 422) {
          throw HTTPExceptionFactory.unprocessableEntity({
            message: errorMessage,
            context: errorDetails
              ? {
                  errorType: 'validation' as const,
                  fieldErrors: [],
                  schemaName: 'ZarinPal API Response',
                }
              : undefined,
          });
        }

        throw HTTPExceptionFactory.fromStatusCode(response.status, {
          message: errorMessage,
          context: {
            errorType: 'payment' as const,
            provider: 'zarinpal' as const,
            gatewayError: errorMessage,
            gatewayCode: response.status.toString(),
          },
        });
      }

      // Parse response JSON
      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Empty response from ZarinPal API');
      }

      try {
        return JSON.parse(responseText) as T;
      } catch {
        throw new Error(`Invalid JSON response from ZarinPal API: ${responseText}`);
      }
    } catch (error) {
      return this.handleError(error, url);
    }
  }

  /**
   * Handle errors with enhanced messages
   * Uses the enhanced version from direct-debit service for better error messages
   */
  protected handleError(error: unknown, context?: string): never {
    if (error instanceof HTTPException) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw HTTPExceptionFactory.gatewayTimeout({
        message: `ZarinPal API timeout: ${context || 'request'}`,
      });
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw HTTPExceptionFactory.serviceUnavailable({
        message: `Unable to connect to ZarinPal API: ${error.message}`,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Enhanced error messages for common payment failures
    if (errorMessage.includes('insufficient_funds')) {
      throw HTTPExceptionFactory.paymentRequired({
        message: 'Insufficient funds for transaction',
      });
    }

    if (errorMessage.includes('card_declined')) {
      throw HTTPExceptionFactory.paymentRequired({
        message: 'Payment method declined',
      });
    }

    if (errorMessage.includes('expired')) {
      throw HTTPExceptionFactory.paymentRequired({
        message: 'Payment method expired',
      });
    }

    // Generic error for other cases
    throw HTTPExceptionFactory.badGateway({
      message: `ZarinPal API error: ${errorMessage}`,
    });
  }

  /**
   * Get base configuration for ZarinPal services
   * Shared configuration logic for all services
   */
  protected static getBaseConfig(env: ApiEnv): BaseZarinPalConfig {
    const merchantId = env.Bindings.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID;
    if (!merchantId) {
      throw new Error('ZarinPal merchant ID not configured (NEXT_PUBLIC_ZARINPAL_MERCHANT_ID)');
    }

    // Determine if we're in sandbox mode based on environment
    // Check if ZARINPAL_SANDBOX_MODE exists in the environment
    const hasSandboxMode = 'ZARINPAL_SANDBOX_MODE' in env.Bindings
      && (env.Bindings as unknown as { ZARINPAL_SANDBOX_MODE?: string }).ZARINPAL_SANDBOX_MODE === 'true';

    const sandboxMode
      = env.Bindings.NEXT_PUBLIC_WEBAPP_ENV === 'local'
        || env.Bindings.NEXT_PUBLIC_WEBAPP_ENV === 'dev'
        || hasSandboxMode;

    return {
      merchantId,
      sandboxMode,
      timeout: 30000,
      sandbox: {
        baseUrl: 'https://sandbox.zarinpal.com',
        merchantId: '00000000-0000-0000-0000-000000000000', // ZarinPal sandbox test ID
      },
      production: {
        baseUrl: 'https://api.zarinpal.com',
      },
    };
  }
}
