/**
 * ZarinPal API Integration Service
 * Migrated to use BaseService pattern for consistent error handling and HTTP utilities
 */

import { z } from '@hono/zod-openapi';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

// =============================================================================
// ZOD SCHEMAS (Context7 Best Practices)
// =============================================================================

/**
 * ZarinPal Configuration Schema
 * Extends ServiceConfig with ZarinPal-specific settings
 */
export const ZarinPalConfigSchema = z.object({
  serviceName: z.string(),
  baseUrl: z.string().url(),
  timeout: z.number().positive(),
  retries: z.number().int().min(0).max(5),
  circuitBreaker: z.object({
    failureThreshold: z.number().int().positive(),
    resetTimeout: z.number().positive(),
  }).optional(),
  merchantId: z.string().length(36, 'ZarinPal merchant ID must be exactly 36 characters'),
  accessToken: z.string().min(32, 'Access token must be at least 32 characters'),
  isSandbox: z.boolean().optional(),
}).openapi('ZarinPalConfig');

/**
 * Payment metadata schema with flexible structure (replaces Record<string, unknown>)
 * Uses .passthrough() to allow additional fields while maintaining type safety for common fields
 */
export const PaymentMetadataSchema = z.object({
  // Core tracking fields
  paymentId: z.string().optional(),
  userId: z.string().optional(),

  // Payment categorization
  type: z.enum(['subscription', 'product', 'custom']).optional(),
  category: z.enum(['payment', 'refund', 'adjustment']).optional(),

  // Subscription-specific fields
  subscriptionId: z.string().uuid().optional(),
  planType: z.enum(['monthly', 'yearly', 'lifetime']).optional(),
  billingCycle: z.union([
    z.string(),
    z.number().int().positive(),
  ]).optional(),
  isAutomaticBilling: z.boolean().optional(),

  // Product-specific fields
  productId: z.string().uuid().optional(),
  productName: z.string().optional(),
  quantity: z.number().int().positive().optional(),

  // General fields
  reference: z.string().optional(),
  notes: z.string().optional(),

  // Allow additional fields for flexibility while maintaining type safety
}).passthrough().openapi('PaymentMetadata');

/**
 * Payment Request Schema
 */
export const PaymentRequestSchema = z.object({
  amount: z.number().int().min(1000, 'Amount must be at least 1000 IRR'),
  currency: z.literal('IRR'),
  description: z.string().min(1).max(255),
  callbackUrl: z.string().url(),
  metadata: PaymentMetadataSchema.optional(),
}).openapi('PaymentRequest');

/**
 * Payment Verification Request Schema
 */
export const VerifyRequestSchema = z.object({
  authority: z.string().length(36, 'Authority must be exactly 36 characters'),
  amount: z.number().int().min(1000, 'Amount must be at least 1000 IRR'),
}).openapi('VerifyRequest');

/**
 * Direct Debit Request Schema
 */
export const DirectDebitRequestSchema = z.object({
  amount: z.number().int().min(1000, 'Amount must be at least 1000 IRR'),
  currency: z.literal('IRR'),
  description: z.string().min(1).max(255),
  card_hash: z.string().min(10, 'Card hash must be at least 10 characters'),
  metadata: PaymentMetadataSchema.optional(),
}).openapi('DirectDebitRequest');

/**
 * ZarinPal API Response Data Schema
 */
export const ZarinPalResponseDataSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  authority: z.string().optional(),
  ref_id: z.number().int().optional(),
  card_hash: z.string().optional(),
  card_pan: z.string().optional(),
  fee_type: z.string().optional(),
  fee: z.number().nonnegative().optional(),
}).openapi('ZarinPalResponseData');

/**
 * ZarinPal Error Schema for response validation
 */
export const ZarinPalErrorSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  field: z.string().optional(),
}).openapi('ZarinPalError');

/**
 * Payment Response Schema (backward compatible)
 */
export const PaymentResponseSchema = z.object({
  data: ZarinPalResponseDataSchema.optional(),
  errors: z.union([
    z.array(ZarinPalErrorSchema),
    z.unknown(), // For backward compatibility with existing error formats
  ]).optional(),
}).openapi('PaymentResponse');

/**
 * Verify Response Schema (backward compatible)
 */
export const VerifyResponseSchema = z.object({
  data: ZarinPalResponseDataSchema.optional(),
  errors: z.union([
    z.array(ZarinPalErrorSchema),
    z.unknown(), // For backward compatibility with existing error formats
  ]).optional(),
}).openapi('VerifyResponse');

// =============================================================================
// TYPE INFERENCE FROM SCHEMAS
// =============================================================================

export type ZarinPalConfig = z.infer<typeof ZarinPalConfigSchema>;
export type PaymentMetadata = z.infer<typeof PaymentMetadataSchema>;
export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;
export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;
export type DirectDebitRequest = z.infer<typeof DirectDebitRequestSchema>;
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;
export type VerifyResponse = z.infer<typeof VerifyResponseSchema>;

/**
 * ZarinPal Service Class
 * Extends BaseService for consistent HTTP handling, error management, and circuit breaking
 */
export class ZarinPalService {
  private config: ZarinPalConfig;

  constructor(config: ZarinPalConfig) {
    this.config = config;
  }

  /**
   * Make HTTP POST request with JSON payload
   */
  private async post<TPayload, TResponse>(
    endpoint: string,
    payload: TPayload,
    headers: Record<string, string>,
    operationName?: string,
  ): Promise<TResponse> {
    return this.makeRequest<TResponse>(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
      },
      operationName,
    );
  }

  /**
   * Make HTTP request with error handling and retries
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit,
    operationName?: string,
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new HTTPException(response.status as 500, {
          message: `HTTP ${response.status}: ${response.statusText}`,
        });
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      throw this.handleError(error, operationName || 'make request', {
        errorType: 'network' as const,
        provider: 'zarinpal' as const,
      });
    }
  }

  /**
   * Handle and transform errors into proper HTTP exceptions
   */
  private handleError(
    error: unknown,
    operationName: string,
    _context: { errorType: 'payment' | 'network'; provider: 'zarinpal' },
  ): HTTPException {
    if (error instanceof HTTPException) {
      return error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('timeout') || errorMessage.includes('abort')) {
      return new HTTPException(HttpStatusCodes.REQUEST_TIMEOUT, {
        message: `ZarinPal ${operationName} timed out: ${errorMessage}`,
      });
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
        message: `ZarinPal ${operationName} network error: ${errorMessage}`,
      });
    }

    return new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: `ZarinPal ${operationName} failed: ${errorMessage}`,
    });
  }

  /**
   * Get service configuration from environment with validation
   * Uses Zod schema validation for type safety
   * Uses OpenNext.js Cloudflare context for consistent environment access
   */
  static getConfig(): ZarinPalConfig {
    const { env } = getCloudflareContext();
    // Validate ZarinPal specific configuration
    if (!env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID || !env.ZARINPAL_ACCESS_TOKEN) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'ZarinPal credentials not configured. Set NEXT_PUBLIC_ZARINPAL_MERCHANT_ID and ZARINPAL_ACCESS_TOKEN.',
      });
    }

    const merchantId = env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID;
    const accessToken = env.ZARINPAL_ACCESS_TOKEN;
    const isSandbox = env.NODE_ENV === 'development';

    const config = {
      serviceName: 'ZarinPal',
      baseUrl: isSandbox ? 'https://sandbox.zarinpal.com' : 'https://api.zarinpal.com',
      timeout: 30000,
      retries: 3,
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 60000,
      },
      merchantId,
      accessToken,
      isSandbox,
    };

    // Validate configuration using Zod schema
    return ZarinPalConfigSchema.parse(config);
  }

  /**
   * Factory method to create service instance with validated configuration
   */
  static create(): ZarinPalService {
    const config = this.getConfig();
    return new ZarinPalService(config);
  }

  /**
   * Request payment from ZarinPal
   * Using BaseService HTTP methods with Zod validation for type safety
   */
  async requestPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Validate input using Zod schema
    const validatedRequest = PaymentRequestSchema.parse(request);
    const payload = {
      merchant_id: this.config.merchantId,
      amount: validatedRequest.amount,
      currency: validatedRequest.currency,
      description: validatedRequest.description,
      callback_url: validatedRequest.callbackUrl,
      metadata: validatedRequest.metadata,
    };

    try {
      const rawResult = await this.post<typeof payload, PaymentResponse>(
        '/pg/v4/payment/request.json',
        payload,
        {
          Authorization: this.config.accessToken,
        },
        'request payment',
      );

      // Validate response using Zod schema while maintaining backward compatibility
      const validatedResult = PaymentResponseSchema.parse(rawResult);

      // Handle ZarinPal error codes
      if (validatedResult.data && validatedResult.data.code !== 100) {
        const errorMessage = this.getZarinPalErrorMessage(validatedResult.data.code);
        throw new HTTPException(HttpStatusCodes.PAYMENT_REQUIRED, {
          message: `Payment request failed: ${errorMessage} (Code: ${validatedResult.data.code})`,
        });
      }

      return validatedResult;
    } catch (error) {
      throw this.handleError(error, 'request payment', {
        errorType: 'payment' as const,
        provider: 'zarinpal' as const,
      });
    }
  }

  /**
   * Verify payment with ZarinPal
   * Using BaseService HTTP methods with Zod validation for type safety
   */
  async verifyPayment(request: VerifyRequest): Promise<VerifyResponse> {
    // Validate input using Zod schema
    const validatedRequest = VerifyRequestSchema.parse(request);
    const payload = {
      merchant_id: this.config.merchantId,
      authority: validatedRequest.authority,
      amount: validatedRequest.amount,
    };

    try {
      const rawResult = await this.post<typeof payload, VerifyResponse>(
        '/pg/v4/payment/verify.json',
        payload,
        {
          Authorization: this.config.accessToken,
        },
        'verify payment',
      );

      // Validate response using Zod schema while maintaining backward compatibility
      const responseResult = VerifyResponseSchema.safeParse(rawResult);
      if (!responseResult.success) {
        throw new Error(`Verify response validation failed: ${responseResult.error.message}`);
      }
      const validatedResult = responseResult.data;

      // Validate response structure
      if (!validatedResult.data && (!validatedResult.errors || (Array.isArray(validatedResult.errors) && validatedResult.errors.length === 0))) {
        throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
          message: 'Invalid verification response format from ZarinPal',
        });
      }

      // Note: Don't throw error for verification codes here as they need to be handled by calling code
      return validatedResult;
    } catch (error) {
      throw this.handleError(error, 'verify payment', {
        errorType: 'payment' as const,
        provider: 'zarinpal' as const,
      });
    }
  }

  /**
   * Process direct debit payment for recurring subscriptions
   * Using BaseService HTTP methods with Zod validation and limited retries
   */
  async directDebitPayment(request: DirectDebitRequest): Promise<PaymentResponse> {
    // Validate input using Zod schema (handles card hash and amount validation)
    const validatedRequest = DirectDebitRequestSchema.parse(request);

    const payload = {
      merchant_id: this.config.merchantId,
      amount: validatedRequest.amount,
      currency: validatedRequest.currency,
      description: validatedRequest.description,
      card_hash: validatedRequest.card_hash,
      metadata: validatedRequest.metadata
        ? {
            payment_type: 'direct_debit',
            ...validatedRequest.metadata,
          }
        : {
            payment_type: 'direct_debit',
          },
    };

    try {
      // Use makeRequest with custom config for limited retries on direct debit
      const rawResult = await this.makeRequest<PaymentResponse>(
        '/pg/v4/payment/request.json',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': this.config.accessToken,
          },
          body: JSON.stringify(payload),
        },
        'direct debit payment',
      );

      // Validate response using Zod schema while maintaining backward compatibility
      const validatedResult = PaymentResponseSchema.parse(rawResult);

      // Validate response structure
      if (!validatedResult.data && (!validatedResult.errors || (Array.isArray(validatedResult.errors) && validatedResult.errors.length === 0))) {
        throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
          message: 'Invalid response format from ZarinPal',
        });
      }

      // Handle ZarinPal specific error codes
      if (validatedResult.data && validatedResult.data.code !== 100 && validatedResult.data.code !== 101) {
        const errorMessage = this.getZarinPalErrorMessage(validatedResult.data.code);
        throw new HTTPException(HttpStatusCodes.PAYMENT_REQUIRED, {
          message: `Direct debit failed: ${errorMessage} (Code: ${validatedResult.data.code})`,
        });
      }

      return validatedResult;
    } catch (error) {
      throw this.handleError(error, 'direct debit payment', {
        errorType: 'payment' as const,
        provider: 'zarinpal' as const,
      });
    }
  }

  /**
   * Get user-friendly error message for ZarinPal error codes
   * Based on official ZarinPal documentation
   */
  private getZarinPalErrorMessage(code: number): string {
    const errorMessages: Record<number, string> = {
      // Common error codes
      '-9': 'Validation error',
      '-10': 'Terminal is not valid',
      '-11': 'Terminal is not active',
      '-12': 'Too many attempts',
      '-15': 'Payment has been suspended',
      '-16': 'Access level is not sufficient',
      '-30': 'Terminal does not allow to perform the operation',
      '-31': 'IP is not allowed',
      '-32': 'Merchant code is not correct',
      '-33': 'Amount should be above 100 Toman',
      '-34': 'Amount limit exceeded',
      '-40': 'Merchant access to method is not allowed',
      '-41': 'Additional Data related to information validation error',
      '-42': 'Validation error in payment request',
      '-54': 'Request archived',
      // Direct debit specific errors
      '-50': 'Amount should be above 500 Toman',
      '-51': 'Amount limit exceeded',
      '-52': 'Card holder information is not correct',
      '-53': 'Redirect address is not correct',
      '-55': 'Request time exceeded',
      '100': 'Operation was successful',
      '101': 'Operation was successful, previously verified',
    };

    return errorMessages[code] || `Unknown error (${code})`;
  }

  /**
   * Get payment gateway URL for redirect
   */
  getPaymentUrl(authority: string): string {
    return `${this.config.baseUrl}/pg/StartPay/${authority}`;
  }
}

// Note: Use ZarinPalService.create() with OpenNext.js Cloudflare context
// This follows proper environment access pattern for OpenNext.js Workers
