/**
 * ZarinPal Direct Debit (Payman) API Service - پرداخت مستقیم
 * Enables customers to make payments without entering payment gateway or card details
 *
 * Official Documentation: https://www.zarinpal.com/docs/directDebit/
 * Service Description: خدمات پرداخت مستقیم - خریدار بدون ورود به درگاه پرداخت
 *
 * ACTIVATION REQUIREMENT:
 * Direct debit service must be activated by submitting a support ticket to ZarinPal
 * before using this API. Service is not available by default.
 *
 * CONTRACT REQUIREMENTS:
 * - Minimum contract duration: 30 days
 * - Contract information (payman_authority & signature) must be securely stored
 * - Merchants must provide contract cancellation functionality (ZarinPal requirement)
 *
 * SECURITY REQUIREMENTS:
 * Contract information including payman_authority and signature must be securely
 * maintained by the merchant. This data enables direct payments and should be
 * treated as sensitive financial credentials.
 *
 * BUSINESS LIMITATIONS:
 * - Requires merchant verification and approval
 * - Subject to transaction limits set by banks
 * - Only available for Iranian bank accounts
 * - Requires customer consent for recurring charges
 */

import { z } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { createZarinPalHTTPException } from '@/api/common/zarinpal-error-utils';
import { validateWithSchema } from '@/api/core/validation';
import type { ApiEnv } from '@/api/types';

import type { BaseZarinPalConfig } from './base-zarinpal-service';
import { BaseZarinPalService } from './base-zarinpal-service';

// =============================================================================
// ZOD SCHEMAS (Context7 Best Practices)
// =============================================================================

/**
 * ZarinPal Direct Debit Configuration Schema
 */
export const ZarinPalDirectDebitConfigSchema = z.object({
  serviceName: z.string(),
  baseUrl: z.string().url('Invalid URL format'),
  timeout: z.number().positive(),
  retries: z.number().int().min(0).max(5),
  circuitBreaker: z.object({
    failureThreshold: z.number().int().positive(),
    resetTimeout: z.number().positive(),
  }).optional(),
  merchantId: z.string().length(36, 'ZarinPal merchant ID must be exactly 36 characters'),
  accessToken: z.string().min(1, 'ZarinPal access token is required'),
  isSandbox: z.boolean().optional(),
  isPlaceholder: z.boolean().optional().openapi({
    description: 'Indicates using development placeholder ID',
  }),
  isSandboxValue: z.boolean().optional().openapi({
    description: 'Indicates using official ZarinPal sandbox credentials',
  }),
}).openapi('ZarinPalDirectDebitConfig');

/**
 * Iranian Mobile Number Schema with validation
 */
export const IranianMobileSchema = z.string()
  .regex(/^(?:\+98|0)?9\d{9}$/, 'Invalid Iranian mobile number format')
  .transform(mobile => mobile.startsWith('+98') ? mobile : mobile.startsWith('09') ? mobile : `09${mobile.slice(-9)}`)
  .openapi({
    example: '09123456789',
    description: 'Iranian mobile number',
  });

/**
 * Iranian National ID (SSN) Schema
 */
export const IranianSSNSchema = z.string()
  .regex(/^\d{10}$/, 'Iranian national ID must be exactly 10 digits')
  .openapi({
    example: '1234567890',
    description: 'Iranian national ID (optional)',
  });

/**
 * Direct Debit Contract Request Schema (Step 1: Create Payman)
 */
export const DirectDebitContractRequestSchema = z.object({
  mobile: IranianMobileSchema,
  ssn: IranianSSNSchema.optional(),
  expire_at: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, 'expire_at must be in Y-m-d H:i:s format').openapi({
    example: '2024-12-31 23:59:59',
    description: 'Contract expiry date in ZarinPal format (YYYY-MM-DD HH:MM:SS)',
  }),
  max_daily_count: z.string().regex(/^\d+$/, 'Must be a numeric string').openapi({
    example: '10',
    description: 'Maximum daily transactions',
  }),
  max_monthly_count: z.string().regex(/^\d+$/, 'Must be a numeric string').openapi({
    example: '100',
    description: 'Maximum monthly transactions',
  }),
  max_amount: z.string().regex(/^\d+$/, 'Must be a numeric string').openapi({
    example: '50000000',
    description: 'Maximum transaction amount in Iranian Rials',
  }),
  callback_url: z.string().url('Invalid callback URL format').openapi({
    example: 'https://example.com/contract/callback',
    description: 'Return URL after contract signing',
  }),
}).openapi('DirectDebitContractRequest');

/**
 * ZarinPal API Error Schema (replaces unknown[])
 */
export const ZarinPalApiErrorSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  field: z.string().optional(),
}).openapi('ZarinPalApiError');

/**
 * Bank Information Schema
 */
export const BankInfoSchema = z.object({
  name: z.string().openapi({
    example: 'بانک ملی ایران',
    description: 'Bank display name in Persian',
  }),
  slug: z.string().openapi({
    example: 'bmi',
    description: 'Bank slug identifier',
  }),
  bank_code: z.string().openapi({
    example: '011',
    description: 'Bank code for contract signing URL',
  }),
  max_daily_amount: z.number().int().nonnegative().openapi({
    example: 50000000,
    description: 'Maximum daily amount in IRR',
  }),
  max_daily_count: z.number().int().nonnegative().nullable().openapi({
    example: 10,
    description: 'Maximum daily transaction count',
  }),
}).openapi('BankInfo');

/**
 * Direct Debit Contract Response Schema
 */
export const DirectDebitContractResponseSchema = z.object({
  data: z.object({
    payman_authority: z.string().min(1, 'Payman authority is required'),
    code: z.number().int(),
    message: z.string(),
  }).optional(),
  errors: z.array(ZarinPalApiErrorSchema).optional(),
}).openapi('DirectDebitContractResponse');

/**
 * Bank List Response Schema
 */
export const BankListResponseSchema = z.object({
  data: z.object({
    banks: z.array(BankInfoSchema),
    code: z.number().int(),
    message: z.string(),
  }).optional(),
  errors: z.array(ZarinPalApiErrorSchema).optional(),
}).openapi('BankListResponse');

/**
 * Signature Verification Request Schema (Step 3)
 */
export const SignatureRequestSchema = z.object({
  payman_authority: z.string().min(1, 'Payman authority is required'),
}).openapi('SignatureRequest');

/**
 * Signature Response Schema
 */
export const SignatureResponseSchema = z.object({
  data: z.object({
    signature: z.string().min(1, 'Signature cannot be empty').refine(
      sig => sig.length === 200 || sig.startsWith('eyJ') || sig.length >= 100,
      'Signature must be 200 characters, JWT token (eyJ...), or valid ZarinPal signature format',
    ),
    code: z.number().int(),
    message: z.string(),
  }).optional(),
  errors: z.array(ZarinPalApiErrorSchema).optional(),
}).openapi('SignatureResponse');

/**
 * Direct Transaction Request Schema (Step 4)
 */
export const DirectTransactionRequestSchema = z.object({
  authority: z.string().length(36, 'Authority must be exactly 36 characters'),
  signature: z.string().min(1, 'Signature cannot be empty').refine(
    sig => sig.length === 200 || sig.startsWith('eyJ') || sig.length >= 100,
    'Signature must be 200 characters, JWT token (eyJ...), or valid ZarinPal signature format',
  ),
}).openapi('DirectTransactionRequest');

/**
 * Direct Transaction Response Schema
 */
export const DirectTransactionResponseSchema = z.object({
  data: z.object({
    refrence_id: z.number().int().positive(),
    amount: z.number().int().positive(),
    code: z.number().int(),
    message: z.string(),
  }).optional(),
  errors: z.array(ZarinPalApiErrorSchema).optional(),
}).openapi('DirectTransactionResponse');

/**
 * Cancel Contract Request Schema (Step 5)
 */
export const CancelContractRequestSchema = z.object({
  signature: z.string().min(1, 'Signature cannot be empty').refine(
    sig => sig.length === 200 || sig.startsWith('eyJ') || sig.length >= 100,
    'Signature must be 200 characters, JWT token (eyJ...), or valid ZarinPal signature format',
  ),
}).openapi('CancelContractRequest');

/**
 * Cancel Contract Response Schema
 */
export const CancelContractResponseSchema = z.object({
  data: z.object({
    code: z.number().int(),
    message: z.string(),
  }).optional(),
  errors: z.array(ZarinPalApiErrorSchema).optional(),
}).openapi('CancelContractResponse');

// =============================================================================
// TYPE INFERENCE FROM SCHEMAS
// =============================================================================

export type ZarinPalDirectDebitConfig = z.infer<typeof ZarinPalDirectDebitConfigSchema>;
export type DirectDebitContractRequest = z.infer<typeof DirectDebitContractRequestSchema>;
export type DirectDebitContractResponse = z.infer<typeof DirectDebitContractResponseSchema>;
export type BankListResponse = z.infer<typeof BankListResponseSchema>;
export type SignatureRequest = z.infer<typeof SignatureRequestSchema>;
export type SignatureResponse = z.infer<typeof SignatureResponseSchema>;
export type DirectTransactionRequest = z.infer<typeof DirectTransactionRequestSchema>;
export type DirectTransactionResponse = z.infer<typeof DirectTransactionResponseSchema>;
export type CancelContractRequest = z.infer<typeof CancelContractRequestSchema>;
export type CancelContractResponse = z.infer<typeof CancelContractResponseSchema>;
export type BankInfo = z.infer<typeof BankInfoSchema>;

/**
 * ZarinPal Direct Debit Service
 * Extends BaseZarinPalService for consistent HTTP handling, error management, and circuit breaking
 * Implements complete Payman (Direct Debit) workflow
 */
export class ZarinPalDirectDebitService extends BaseZarinPalService {
  private directDebitConfig: ZarinPalDirectDebitConfig;

  constructor(config: ZarinPalDirectDebitConfig, env?: ApiEnv) {
    // Convert direct debit config to base config format
    const baseConfig: BaseZarinPalConfig = {
      merchantId: config.merchantId,
      sandboxMode: config.isSandbox || false,
      timeout: config.timeout,
      sandbox: {
        baseUrl: config.isSandbox ? config.baseUrl : 'https://sandbox.zarinpal.com',
        merchantId: '00000000-0000-0000-0000-000000000000',
      },
      production: {
        baseUrl: !config.isSandbox ? config.baseUrl : 'https://api.zarinpal.com',
      },
    };
    super(baseConfig, env);
    this.directDebitConfig = config;
  }

  /**
   * Override getAuthorizationHeader to use access token
   */
  protected getAuthorizationHeader(): string {
    const token = this.directDebitConfig.accessToken;
    // Check if token already starts with "Bearer " (case-insensitive)
    if (token.toLowerCase().startsWith('bearer ')) {
      return token;
    }
    return `Bearer ${token}`;
  }

  /**
   * Make HTTP POST request to Payman API (always uses production URL)
   * Payman endpoints don't require Authorization header, only merchant_id in payload
   */
  private async postPayman<TPayload, TResponse>(
    endpoint: string,
    payload: TPayload,
    operationName?: string,
  ): Promise<TResponse> {
    // Payman API is only available on production ZarinPal API, not sandbox
    const url = `https://api.zarinpal.com${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle HTTP 422 specifically to extract ZarinPal error details
      if (response.status === 422) {
        const responseText = await response.text();
        let errorDetails = responseText;

        try {
          const parsedResponse = JSON.parse(responseText);
          // Extract ZarinPal error message if available
          if (parsedResponse.errors && Array.isArray(parsedResponse.errors) && parsedResponse.errors.length > 0) {
            errorDetails = parsedResponse.errors[0].message || parsedResponse.errors[0].code || responseText;
          } else if (parsedResponse.data && parsedResponse.data.message) {
            errorDetails = parsedResponse.data.message;
          }
        } catch {
          // Keep original responseText if JSON parsing fails
        }

        throw new HTTPException(422, {
          message: `HTTP 422: Unprocessable Content. ${errorDetails}`,
        });
      }

      if (!response.ok) {
        const responseText = await response.text();
        throw new HTTPException(response.status as 500, {
          message: `HTTP ${response.status}: ${response.statusText}. Response: ${responseText}`,
        });
      }

      const data = await response.json();
      return data as TResponse;
    } catch (error) {
      throw this.handleError(error, operationName || 'make request');
    }
  }

  /**
   * Make HTTP GET request to Payman API (always uses production URL)
   * Payman endpoints don't require Authorization header
   */
  private async getPayman<TResponse>(
    endpoint: string,
    operationName?: string,
  ): Promise<TResponse> {
    // Payman API is only available on production ZarinPal API, not sandbox
    const url = `https://api.zarinpal.com${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const responseText = await response.text();
        throw new HTTPException(response.status as 500, {
          message: `HTTP ${response.status}: ${response.statusText}. Response: ${responseText}`,
        });
      }

      const data = await response.json();
      return data as TResponse;
    } catch (error) {
      throw this.handleError(error, operationName || 'make request');
    }
  }

  /**
   * Handle and transform errors into proper HTTP exceptions
   */
  protected handleError(error: unknown, context?: string): never {
    if (error instanceof HTTPException) {
      // Enhanced handling for HTTP 422 errors
      if (error.status === 422) {
        const message = error.message || 'Unprocessable Content';

        // Check for common ZarinPal validation errors
        if (message.includes('insufficient') || message.includes('balance') || message.includes('funds')) {
          throw new HTTPException(422, {
            message: `Payment failed: HTTP 422: Unprocessable Content. Please ensure your bank account has sufficient funds and try again.`,
          });
        }

        if (message.includes('invalid') || message.includes('validation')) {
          throw new HTTPException(422, {
            message: `Payment failed: HTTP 422: Invalid payment parameters. Please check your payment details and try again.`,
          });
        }

        // Generic 422 handling
        throw new HTTPException(422, {
          message: `Payment failed: HTTP 422: Unprocessable Content. Please ensure your bank account has sufficient funds and try again.`,
        });
      }

      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle specific ZarinPal error patterns
    if (errorMessage.includes('422')) {
      throw new HTTPException(422, {
        message: `Payment failed: HTTP 422: Unprocessable Content. Please ensure your bank account has sufficient funds and try again.`,
      });
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('abort')) {
      throw new HTTPException(HttpStatusCodes.REQUEST_TIMEOUT, {
        message: `ZarinPal Direct Debit ${context || 'operation'} timed out: ${errorMessage}`,
      });
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
        message: `ZarinPal Direct Debit ${context || 'operation'} network error: ${errorMessage}`,
      });
    }

    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: `ZarinPal Direct Debit ${context || 'operation'} failed: ${errorMessage}`,
    });
  }

  /**
   * Get service configuration from environment with proper validation patterns
   * Following API Development Guide - schema-first with discriminated unions
   * Accepts environment from Hono context for proper secret access
   */
  static getConfig(env: ApiEnv): ZarinPalDirectDebitConfig {
    // Use backend environment variable (without NEXT_PUBLIC_ prefix)
    if (!env.Bindings.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'ZarinPal merchant ID not configured. Set NEXT_PUBLIC_ZARINPAL_MERCHANT_ID.',
      });
    }

    // Validate merchant ID format (UUID)
    const merchantIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!merchantIdRegex.test(env.Bindings.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID)) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Invalid ZarinPal merchant ID format. Must be a valid UUID.',
      });
    }

    // Warn if using obvious placeholder values but allow development UUIDs
    const placeholderPatterns = [
      'YOUR_',
      'your-merchant-id',
      'REPLACE_',
      'PLACEHOLDER',
      'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    ];

    const isPlaceholder = placeholderPatterns.some(pattern =>
      env.Bindings.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID ? env.Bindings.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID.includes(pattern) : false,
    );
    const isSandbox = env.Bindings.NEXT_PUBLIC_WEBAPP_ENV === 'development';

    // Check for sandbox values but allow them in development
    const ZARINPAL_SANDBOX_VALUES = [
      '36e0ea98-43fa-400d-a421-f7593b1c73bc', // Official sandbox merchant ID
      'zp-sandbox-access-token', // Official sandbox access token
    ];
    const isSandboxValue = (env.Bindings.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID && ZARINPAL_SANDBOX_VALUES.includes(env.Bindings.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID))
      || (env.Bindings.ZARINPAL_ACCESS_TOKEN && ZARINPAL_SANDBOX_VALUES.includes(env.Bindings.ZARINPAL_ACCESS_TOKEN));

    if (isPlaceholder) {
      // In development, allow placeholder but warn
      if (isSandbox) {
        // Development mode: Using placeholder credentials
        // NOTE: Configure real ZarinPal merchant ID from https://next.zarinpal.com/panel/ for production
      } else {
        // In production, still throw error
        throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
          message: 'Invalid ZarinPal merchant ID. Please replace with your real merchant ID from https://next.zarinpal.com/panel/',
        });
      }
    }

    // Fix environment detection for Cloudflare Workers
    const webappEnv = env.Bindings.NEXT_PUBLIC_WEBAPP_ENV || 'production';
    const isSandboxEnvironment = webappEnv === 'local' || webappEnv === 'development';

    const config = {
      serviceName: 'ZarinPal-DirectDebit',
      // Use sandbox for local development, production API for preview/production
      baseUrl: isSandboxEnvironment ? 'https://sandbox.zarinpal.com' : 'https://api.zarinpal.com',
      timeout: 30000,
      retries: 2,
      circuitBreaker: {
        failureThreshold: 3,
        resetTimeout: 60000,
      },
      merchantId: env.Bindings.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID,
      accessToken: env.Bindings.ZARINPAL_ACCESS_TOKEN,
      isSandbox: isSandboxEnvironment,
      isPlaceholder: isPlaceholder && !(isSandboxValue && isSandboxEnvironment), // Don't treat sandbox values as placeholders in development
      isSandboxValue,
    };

    // Validate configuration using discriminated union patterns per API guide
    const result = validateWithSchema(ZarinPalDirectDebitConfigSchema, config);
    if (!result.success) {
      const errorMessage = result.errors[0]?.message || 'Configuration validation failed';
      throw new Error(`ZarinPal Direct Debit config validation failed: ${errorMessage}`);
    }
    return result.data;
  }

  /**
   * Factory method to create service instance with validated configuration
   * @param env - Environment variables from Hono context (c.env)
   */
  static create(env: ApiEnv): ZarinPalDirectDebitService {
    const config = this.getConfig(env);
    return new ZarinPalDirectDebitService(config);
  }

  /**
   * Step 1: Request Direct Debit Contract (Payman Request)
   *
   * IMPORTANT: This service requires prior activation via ZarinPal support ticket
   * CONTRACT TERMS: Minimum 30-day duration, secure storage required
   *
   * USAGE EXAMPLE:
   * 1. Request contract: requestContract(contractData)
   * 2. Redirect user to: getContractSigningUrl(authority, bankCode)
   * 3. Verify signature: verifyContractAndGetSignature(authority)
   * 4. Store signature securely for future charges
   * 5. Use chargeDirectDebit() for recurring payments
   *
   * @param request Contract parameters including mobile, expiry, and limits
   * @returns Contract response with payman_authority for signing process
   */
  async requestContract(request: DirectDebitContractRequest): Promise<DirectDebitContractResponse> {
    // Validate input using discriminated unions per API Development Guide
    const requestResult = validateWithSchema(DirectDebitContractRequestSchema, request);
    if (!requestResult.success) {
      const errorMessage = requestResult.errors[0]?.message || 'Contract request validation failed';
      throw new Error(`Direct debit contract request validation failed: ${errorMessage}`);
    }
    const validatedRequest = requestResult.data;

    // Mock only in local development environment
    if (this.env && this.env.Bindings.NEXT_PUBLIC_WEBAPP_ENV === 'local') {
      // Mock successful response for local development based on ZarinPal docs
      return {
        data: {
          payman_authority: `payman_${Math.random().toString(36).substring(2, 8)}`,
          code: 100,
          message: 'Success',
        },
        errors: [],
      };
    }

    const payload = {
      merchant_id: this.config.merchantId,
      mobile: validatedRequest.mobile,
      ssn: validatedRequest.ssn,
      expire_at: validatedRequest.expire_at,
      max_daily_count: validatedRequest.max_daily_count,
      max_monthly_count: validatedRequest.max_monthly_count,
      max_amount: validatedRequest.max_amount,
      callback_url: validatedRequest.callback_url,
    };

    try {
      const rawResult = await this.postPayman<typeof payload, DirectDebitContractResponse>(
        '/pg/v4/payman/request.json',
        payload,
        'contract request',
      );

      // Validate response using discriminated unions per API guide
      const responseResult = validateWithSchema(DirectDebitContractResponseSchema, rawResult);
      if (!responseResult.success) {
        const errorMessage = responseResult.errors[0]?.message || 'Contract response validation failed';
        throw new Error(`Direct debit contract response validation failed: ${errorMessage}`);
      }
      const validatedResult = responseResult.data;

      if (validatedResult.data && validatedResult.data.code !== 100) {
        createZarinPalHTTPException('contract request', HttpStatusCodes.BAD_REQUEST, validatedResult.data?.message || 'Unknown error');
      }

      if (!validatedResult.data?.payman_authority) {
        createZarinPalHTTPException('contract request', HttpStatusCodes.BAD_REQUEST, validatedResult.data?.message || 'Unknown error');
      }

      return validatedResult;
    } catch (error) {
      // Enhanced error handling for common direct debit setup issues
      if (error instanceof Error || (error && typeof error === 'object' && 'message' in error)) {
        const errorMessage = String(error.message || '').toLowerCase();

        // Check for direct debit not enabled error (ZarinPal error code -80)
        if (errorMessage.includes('merchant have not access')
          || errorMessage.includes('access denied')
          || errorMessage.includes('merchant does not have access to direct debit')
          || errorMessage.includes('-80')) {
          throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
            message: 'Direct debit service is not enabled for this merchant account. Please contact ZarinPal support to enable the direct debit (Payman) service first.',
          });
        }

        // Check for invalid merchant credentials
        if (errorMessage.includes('invalid merchant')
          || errorMessage.includes('merchant not found')
          || errorMessage.includes('-74')) {
          throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
            message: 'Invalid merchant credentials. Please check your ZarinPal configuration.',
          });
        }

        // Check for invalid mobile number format
        if (errorMessage.includes('invalid mobile') || errorMessage.includes('mobile')) {
          throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
            message: 'Invalid mobile number format. Please check the mobile number and try again.',
          });
        }
      }

      throw this.handleError(error, 'request contract');
    }
  }

  /**
   * Step 2: Get list of available banks for contract signing
   * Using BaseService HTTP methods with Zod validation for type safety
   */
  async getBankList(): Promise<BankListResponse> {
    try {
      const rawResult = await this.getPayman<BankListResponse>(
        '/pg/v4/payman/banksList.json',
        'get bank list',
      );

      // Validate response using discriminated unions per API guide
      const responseResult = validateWithSchema(BankListResponseSchema, rawResult);
      if (!responseResult.success) {
        const errorMessage = responseResult.errors[0]?.message || 'Bank list response validation failed';
        throw new Error(`Bank list response validation failed: ${errorMessage}`);
      }
      const validatedResult = responseResult.data;
      return validatedResult;
    } catch (error) {
      throw this.handleError(error, 'get bank list');
    }
  }

  /**
   * Get contract signing URL
   * User should be redirected to this URL with selected bank
   */
  getContractSigningUrl(paymanAuthority: string, bankCode: string): string {
    return `https://www.zarinpal.com/pg/StartPayman/${paymanAuthority}/${bankCode}`;
  }

  /**
   * Step 3: Verify contract and get signature after user returns
   * Using BaseService HTTP methods with Zod validation for type safety
   */
  async verifyContractAndGetSignature(request: SignatureRequest): Promise<SignatureResponse> {
    // Validate input using discriminated unions per API Development Guide
    const requestResult = validateWithSchema(SignatureRequestSchema, request);
    if (!requestResult.success) {
      const errorMessage = requestResult.errors[0]?.message || 'Signature request validation failed';
      throw new Error(`Signature request validation failed: ${errorMessage}`);
    }
    const validatedRequest = requestResult.data;

    // Test environment mock for development
    const webappEnv = this.env ? this.env.Bindings.NEXT_PUBLIC_WEBAPP_ENV : 'production';
    if (webappEnv === 'local') {
      // Mock successful response for test environment based on ZarinPal docs
      return {
        data: {
          signature: 'eyJpdiI6InpoUHZoT0hPZjdNNjU1VmExckNyNnJxZGVlWUMzZjdOMEdEcE90UnAzK3dqZz0iLCJ2YWx1ZSI6IlozZW9ReG9GVnE5L1dma3UxZU5XVE9pU25rMmZaSWVEeDUvY3RITm4xV0lSTHN2dXN3MTNGR3MxVERGcGVKdG9hNWtZeThKSWJlZkZyTmVnY2JSNEM1WE9rRFhWVFl6QklHd3FLRU55a1lkVHNOdzZocXFBK3ZyTlBlb3R2eUxmUWJ3VGNvVFNDVDBsWVRqSnJJZmlzSEF3REE1SjE4MWVYaEpWcHJoMVRJPSIsIm1hYyI6Ijc4YTgzOGY4ZjQzYzQzYzU2NmFkZDZkNGUzZjQ3ODk4ZTIzZGEzOWY3ZGMxOGJmNGU0YzNhZmEwYmI5M2E4ODQifQ==',
          code: 100,
          message: 'Success',
        },
        errors: [],
      };
    }

    const payload = {
      merchant_id: this.config.merchantId,
      payman_authority: validatedRequest.payman_authority,
    };

    try {
      const result = await this.postPayman<typeof payload, SignatureResponse>(
        '/pg/v4/payman/verify.json',
        payload,
        'contract verification',
      );

      if (result.data && result.data.code !== 100) {
        createZarinPalHTTPException('contract verification', HttpStatusCodes.BAD_REQUEST, result.data?.message || 'Unknown error');
      }

      return result;
    } catch (error) {
      throw this.handleError(error, 'verify contract and get signature');
    }
  }

  /**
   * Step 4: Execute direct transaction using signature
   * Using BaseService with limited retries to avoid duplicate charges
   * Following API Development Guide patterns for validation
   * Note: You still need to create regular payment authority first
   */
  async executeDirectTransaction(request: DirectTransactionRequest): Promise<DirectTransactionResponse> {
    // Validate input using discriminated unions per API Development Guide
    const requestResult = validateWithSchema(DirectTransactionRequestSchema, request);
    if (!requestResult.success) {
      const errorMessage = requestResult.errors[0]?.message || 'Direct transaction request validation failed';
      throw new Error(`Direct transaction request validation failed: ${errorMessage}`);
    }

    const payload = {
      merchant_id: this.config.merchantId,
      authority: request.authority,
      signature: request.signature,
    };

    try {
      // Use postPayman for Payman-specific endpoint (always uses production API)
      const result = await this.postPayman<typeof payload, DirectTransactionResponse>(
        '/pg/v4/payman/checkout.json',
        payload,
        'direct transaction',
      );

      if (result.data && result.data.code !== 100) {
        createZarinPalHTTPException('direct transaction', HttpStatusCodes.BAD_REQUEST, result.data?.message || 'Unknown error');
      }

      return result;
    } catch (error) {
      throw this.handleError(error, 'execute direct transaction');
    }
  }

  /**
   * Step 5: Cancel Direct Debit Contract
   *
   * NOTE: Contract cancellation is REQUIRED by ZarinPal terms of service.
   * Merchants must provide this functionality to customers as per regulations.
   * Failure to implement this feature may result in service suspension.
   *
   * @param request Contract cancellation request with signature
   * @returns Cancellation confirmation response
   */
  async cancelContract(request: CancelContractRequest): Promise<CancelContractResponse> {
    // Validate input using discriminated unions per API Development Guide
    const requestResult = validateWithSchema(CancelContractRequestSchema, request);
    if (!requestResult.success) {
      const errorMessage = requestResult.errors[0]?.message || 'Cancel contract request validation failed';
      throw new Error(`Cancel contract request validation failed: ${errorMessage}`);
    }
    const validatedRequest = requestResult.data;

    const payload = {
      merchant_id: this.config.merchantId,
      signature: validatedRequest.signature,
    };

    try {
      const result = await this.postPayman<typeof payload, CancelContractResponse>(
        '/pg/v4/payman/cancelContract.json',
        payload,
        'cancel contract',
      );

      if (result.data && result.data.code !== 100) {
        createZarinPalHTTPException('cancel contract', HttpStatusCodes.BAD_REQUEST, result.data?.message || 'Unknown error');
      }

      return result;
    } catch (error) {
      throw this.handleError(error, 'cancel contract');
    }
  }

  /**
   * Direct charge from bank account using contract signature
   * This is the core method for automated recurring payments
   * Step 1: Create payment authority, Step 2: Execute direct transaction
   */
  async chargeDirectDebit(params: {
    amount: number;
    currency: 'IRR';
    description: string;
    contractSignature: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
      success: boolean;
      data?: { refId: number; amount: number };
      error?: string;
    }> {
    try {
      // Validate input parameters
      if (!params.amount || params.amount < 1000) {
        return {
          success: false,
          error: 'Invalid amount: Minimum amount is 1,000 IRR',
        };
      }

      if (!params.contractSignature || params.contractSignature.length < 10) {
        return {
          success: false,
          error: 'Invalid contract signature: Signature is required for direct debit',
        };
      }

      // Step 1: Create payment authority for the amount (like a regular payment request)
      const authPayload = {
        merchant_id: this.config.merchantId,
        amount: params.amount,
        currency: params.currency,
        description: params.description,
        callback_url: 'https://api.zarinpal.com', // Not used for direct debit but required
        metadata: {
          payment_type: 'direct_debit',
          ...params.metadata,
        },
      };

      let authResult;
      try {
        authResult = await this.post<typeof authPayload, { data?: { authority: string; code: number; message?: string } }>(
          '/pg/v4/payment/request.json',
          authPayload,
          true,
        );
      } catch (authError) {
        // Handle specific errors during payment authority creation
        if (authError instanceof HTTPException && authError.status === 422) {
          return {
            success: false,
            error: authError.message,
          };
        }
        throw authError; // Re-throw for general error handling
      }

      if (!authResult.data?.authority || authResult.data.code !== 100) {
        const errorMessage = authResult.data?.message || `ZarinPal error code: ${authResult.data?.code || 'unknown'}`;
        return {
          success: false,
          error: `Failed to create payment authority: ${errorMessage}`,
        };
      }

      // Step 2: Execute direct transaction using the signature
      let checkoutResult;
      try {
        checkoutResult = await this.executeDirectTransaction({
          authority: authResult.data.authority,
          signature: params.contractSignature,
        });
      } catch (checkoutError) {
        // Handle specific errors during checkout
        if (checkoutError instanceof HTTPException && checkoutError.status === 422) {
          return {
            success: false,
            error: checkoutError.message,
          };
        }
        throw checkoutError; // Re-throw for general error handling
      }

      // Log the actual response for debugging payment issues
      console.warn('ZarinPal checkout response:', JSON.stringify(checkoutResult, null, 2));

      if (checkoutResult.data && checkoutResult.data.code === 100) {
        // Check if we have a valid reference ID (could be 0, so check for number type)
        if (typeof checkoutResult.data.refrence_id === 'number') {
          return {
            success: true,
            data: {
              refId: checkoutResult.data.refrence_id,
              amount: checkoutResult.data.amount,
            },
          };
        } else {
          // Success response but no reference ID - still consider it successful
          // This can happen in some ZarinPal responses
          return {
            success: true,
            data: {
              refId: 0, // Use 0 as fallback reference ID
              amount: checkoutResult.data.amount || params.amount,
            },
          };
        }
      } else {
        // Only treat as error if code is not 100 (success)
        let errorMessage = 'Direct debit transaction failed';

        if (checkoutResult.data?.code !== 100) {
          if (checkoutResult.data?.message && checkoutResult.data.message !== 'Success') {
            errorMessage = checkoutResult.data.message;
          } else if (checkoutResult.data?.code) {
            errorMessage = `ZarinPal error code: ${checkoutResult.data.code}`;
          }
        } else if (checkoutResult.errors && Array.isArray(checkoutResult.errors) && checkoutResult.errors.length > 0) {
          const firstError = checkoutResult.errors[0];
          if (typeof firstError === 'object' && firstError !== null) {
            if ('message' in firstError && typeof firstError.message === 'string') {
              errorMessage = firstError.message;
            } else if ('code' in firstError && (typeof firstError.code === 'string' || typeof firstError.code === 'number')) {
              errorMessage = `ZarinPal error code: ${String(firstError.code)}`;
            }
          }
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      // Enhanced error handling with specific HTTP status detection
      if (error instanceof HTTPException) {
        if (error.status === 422) {
          return {
            success: false,
            error: error.message,
          };
        }
        return {
          success: false,
          error: `Payment service error (HTTP ${error.status}): ${error.message}`,
        };
      }

      // Handle other error types
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during direct debit charge';

      // Check if error message indicates specific issues
      if (errorMessage.includes('422') || errorMessage.includes('Unprocessable')) {
        return {
          success: false,
          error: 'Payment failed: HTTP 422: Unprocessable Content. Please ensure your bank account has sufficient funds and try again.',
        };
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
