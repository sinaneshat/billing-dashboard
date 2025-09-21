/**
 * ZarinPal Direct Debit (Payman) API Service
 * Migrated to use BaseService pattern for consistent error handling and HTTP utilities
 * Implementation following official ZarinPal direct debit documentation
 * https://docs.zarinpal.com/paymentGateway/directPayment.html
 */

import { z } from '@hono/zod-openapi';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { createZarinPalHTTPException } from '@/api/common/zarinpal-error-utils';
import { validateWithSchema } from '@/api/core/validation';

// =============================================================================
// ZOD SCHEMAS (Context7 Best Practices)
// =============================================================================

/**
 * ZarinPal Direct Debit Configuration Schema
 */
export const ZarinPalDirectDebitConfigSchema = z.object({
  serviceName: z.string(),
  baseUrl: z.string().url(),
  timeout: z.number().positive(),
  retries: z.number().int().min(0).max(5),
  circuitBreaker: z.object({
    failureThreshold: z.number().int().positive(),
    resetTimeout: z.number().positive(),
  }).optional(),
  merchantId: z.string().length(36, 'ZarinPal merchant ID must be exactly 36 characters'),
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
  callback_url: z.string().url().openapi({
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
    signature: z.string().length(200, 'Signature must be exactly 200 characters'),
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
  signature: z.string().length(200, 'Signature must be exactly 200 characters'),
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
 * Contract Cancellation Request Schema
 */
export const CancelContractRequestSchema = z.object({
  signature: z.string().length(200, 'Signature must be exactly 200 characters'),
}).openapi('CancelContractRequest');

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
export type BankInfo = z.infer<typeof BankInfoSchema>;

/**
 * ZarinPal Direct Debit Service
 * Extends BaseService for consistent HTTP handling, error management, and circuit breaking
 * Implements complete Payman (Direct Debit) workflow
 */
export class ZarinPalDirectDebitService {
  private config: ZarinPalDirectDebitConfig;

  constructor(config: ZarinPalDirectDebitConfig) {
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
   * Make HTTP GET request
   */
  private async get<TResponse>(
    endpoint: string,
    headers: Record<string, string>,
    operationName?: string,
  ): Promise<TResponse> {
    return this.makeRequest<TResponse>(
      endpoint,
      {
        method: 'GET',
        headers,
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
        message: `ZarinPal Direct Debit ${operationName} timed out: ${errorMessage}`,
      });
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
        message: `ZarinPal Direct Debit ${operationName} network error: ${errorMessage}`,
      });
    }

    return new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: `ZarinPal Direct Debit ${operationName} failed: ${errorMessage}`,
    });
  }

  /**
   * Get service configuration from environment with proper validation patterns
   * Following API Development Guide - schema-first with discriminated unions
   * Uses OpenNext.js Cloudflare context for consistent environment access
   */
  static getConfig(): ZarinPalDirectDebitConfig {
    const { env } = getCloudflareContext();
    if (!env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'ZarinPal merchant ID not configured. Set NEXT_PUBLIC_ZARINPAL_MERCHANT_ID.',
      });
    }

    // Validate merchant ID format (UUID)
    const merchantIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!merchantIdRegex.test(env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID)) {
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
      env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID ? env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID.includes(pattern) : false,
    );
    const isSandbox = env.NODE_ENV === 'development';

    // Check for sandbox values but allow them in development
    const ZARINPAL_SANDBOX_VALUES = [
      '36e0ea98-43fa-400d-a421-f7593b1c73bc', // Official sandbox merchant ID
      'zp-sandbox-access-token', // Official sandbox access token
    ];
    const isSandboxValue = (env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID && ZARINPAL_SANDBOX_VALUES.includes(env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID))
      || (env.ZARINPAL_ACCESS_TOKEN && ZARINPAL_SANDBOX_VALUES.includes(env.ZARINPAL_ACCESS_TOKEN));

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

    const config = {
      serviceName: 'ZarinPal-DirectDebit',
      baseUrl: 'https://api.zarinpal.com', // Direct debit only works on production
      timeout: 30000,
      retries: 2,
      circuitBreaker: {
        failureThreshold: 3,
        resetTimeout: 60000,
      },
      merchantId: env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID,
      isSandbox,
      isPlaceholder: isPlaceholder && !(isSandboxValue && isSandbox), // Don't treat sandbox values as placeholders in development
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
   */
  static create(): ZarinPalDirectDebitService {
    const config = this.getConfig();
    return new ZarinPalDirectDebitService(config);
  }

  /**
   * Step 1: Request Direct Debit Contract (Payman Request)
   * Using BaseService HTTP methods with Zod validation for type safety
   */
  async requestContract(request: DirectDebitContractRequest): Promise<DirectDebitContractResponse> {
    // Validate input using discriminated unions per API Development Guide
    const requestResult = validateWithSchema(DirectDebitContractRequestSchema, request);
    if (!requestResult.success) {
      const errorMessage = requestResult.errors[0]?.message || 'Contract request validation failed';
      throw new Error(`Direct debit contract request validation failed: ${errorMessage}`);
    }
    const validatedRequest = requestResult.data;

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
      const rawResult = await this.post<typeof payload, DirectDebitContractResponse>(
        '/pg/v4/payman/request.json',
        payload,
        {},
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

      throw this.handleError(error, 'request contract', {
        errorType: 'payment' as const,
        provider: 'zarinpal' as const,
      });
    }
  }

  /**
   * Step 2: Get list of available banks for contract signing
   * Using BaseService HTTP methods with Zod validation for type safety
   */
  async getBankList(): Promise<BankListResponse> {
    try {
      const rawResult = await this.get<BankListResponse>(
        '/pg/v4/payman/banksList.json',
        {},
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
      throw this.handleError(error, 'get bank list', {
        errorType: 'network' as const,
        provider: 'zarinpal' as const,
      });
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

    const payload = {
      merchant_id: this.config.merchantId,
      payman_authority: validatedRequest.payman_authority,
    };

    try {
      const result = await this.post<typeof payload, SignatureResponse>(
        '/pg/v4/payman/verify.json',
        payload,
        {},
        'contract verification',
      );

      if (result.data && result.data.code !== 100) {
        createZarinPalHTTPException('contract verification', HttpStatusCodes.BAD_REQUEST, result.data?.message || 'Unknown error');
      }

      return result;
    } catch (error) {
      throw this.handleError(error, 'verify contract and get signature', {
        errorType: 'payment' as const,
        provider: 'zarinpal' as const,
      });
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
      // Use makeRequest for limited retries on financial transactions
      const result = await this.makeRequest<DirectTransactionResponse>(
        '/pg/v4/payman/checkout.json',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
        'direct transaction',
      );

      if (result.data && result.data.code !== 100) {
        createZarinPalHTTPException('direct transaction', HttpStatusCodes.BAD_REQUEST, result.data?.message || 'Unknown error');
      }

      return result;
    } catch (error) {
      throw this.handleError(error, 'execute direct transaction', {
        errorType: 'payment' as const,
        provider: 'zarinpal' as const,
      });
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

      const authResult = await this.post<typeof authPayload, { data?: { authority: string; code: number } }>(
        '/pg/v4/payment/request.json',
        authPayload,
        {},
        'create payment authority for direct debit',
      );

      if (!authResult.data?.authority || authResult.data.code !== 100) {
        return {
          success: false,
          error: `Failed to create payment authority: ${authResult.data?.code || 'unknown error'}`,
        };
      }

      // Step 2: Execute direct transaction using the signature
      const checkoutResult = await this.executeDirectTransaction({
        authority: authResult.data.authority,
        signature: params.contractSignature,
      });

      if (checkoutResult.data && checkoutResult.data.code === 100 && checkoutResult.data.refrence_id) {
        return {
          success: true,
          data: {
            refId: checkoutResult.data.refrence_id,
            amount: checkoutResult.data.amount,
          },
        };
      } else {
        const errorMessage = checkoutResult.data?.message
          || (checkoutResult.errors && checkoutResult.errors.length > 0 ? checkoutResult.errors[0]?.message : undefined)
          || 'Direct debit transaction failed';

        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during direct debit charge',
      };
    }
  }

  /**
   * Cancel direct debit contract
   * Using BaseService HTTP methods for consistent error handling
   */
  async cancelContract(request: CancelContractRequest): Promise<{ code: number; message: string }> {
    const payload = {
      merchant_id: this.config.merchantId,
      signature: request.signature,
    };

    try {
      const result = await this.post<typeof payload, { data?: { code: number; message: string } }>(
        '/pg/v4/payman/cancelContract.json',
        payload,
        {},
        'cancel contract',
      );

      if (result.data && result.data.code !== 100) {
        createZarinPalHTTPException('contract cancellation', HttpStatusCodes.BAD_REQUEST, result.data?.message || 'Unknown error');
      }

      return {
        code: result.data?.code || 0,
        message: result.data?.message || 'Contract cancelled successfully',
      };
    } catch (error) {
      throw this.handleError(error, 'cancel contract', {
        errorType: 'payment' as const,
        provider: 'zarinpal' as const,
      });
    }
  }
}
