/**
 * ZarinPal Direct Debit (Payman) API Service
 * Migrated to use BaseService pattern for consistent error handling and HTTP utilities
 * Implementation following official ZarinPal direct debit documentation
 * https://docs.zarinpal.com/paymentGateway/directPayment.html
 */

import { z } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { createZarinPalHTTPException } from '@/api/common/zarinpal-error-utils';
import { BaseService } from '@/api/patterns/service-factory';

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
  expire_at: z.string().datetime().openapi({
    example: '2024-12-31 23:59:59',
    description: 'Contract expiry date in YYYY-MM-DD HH:MM:SS format',
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
    payman_authority: z.string().length(36, 'Payman authority must be exactly 36 characters'),
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
  payman_authority: z.string().length(36, 'Payman authority must be exactly 36 characters'),
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
export class ZarinPalDirectDebitService extends BaseService<ZarinPalDirectDebitConfig> {
  constructor(config: ZarinPalDirectDebitConfig) {
    super(config);
  }

  /**
   * Get service configuration from environment with Zod validation
   */
  static getConfig(env: CloudflareEnv): ZarinPalDirectDebitConfig {
    if (!env.ZARINPAL_MERCHANT_ID) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'ZarinPal merchant ID not configured. Set ZARINPAL_MERCHANT_ID.',
      });
    }

    // Validate merchant ID format (UUID)
    const merchantIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!merchantIdRegex.test(env.ZARINPAL_MERCHANT_ID)) {
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

    const isPlaceholder = placeholderPatterns.some(pattern => env.ZARINPAL_MERCHANT_ID!.includes(pattern));
    const isSandbox = env.NODE_ENV === 'development';

    if (isPlaceholder) {
      // In development, allow placeholder but warn
      if (isSandbox) {
        console.warn('⚠️  Using placeholder ZarinPal merchant ID. API calls will fail but won\'t crash the application.');
        console.warn('📝 To test real payments, get credentials from https://next.zarinpal.com/panel/');
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
      merchantId: env.ZARINPAL_MERCHANT_ID,
      isSandbox,
      isPlaceholder,
    };

    // Validate configuration using Zod schema
    return ZarinPalDirectDebitConfigSchema.parse(config);
  }

  /**
   * Step 1: Request Direct Debit Contract (Payman Request)
   * Using BaseService HTTP methods with Zod validation for type safety
   */
  async requestContract(request: DirectDebitContractRequest): Promise<DirectDebitContractResponse> {
    // Validate input using Zod schema
    const validatedRequest = DirectDebitContractRequestSchema.parse(request);

    // Return mock data in development with placeholder ID
    if (this.config.isPlaceholder) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Development mode: Using placeholder ZarinPal credentials. Please configure real merchant ID for actual payments.',
      });
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
      const rawResult = await this.post<typeof payload, DirectDebitContractResponse>(
        '/pg/v4/payman/request.json',
        payload,
        {},
        'contract request',
      );

      // Validate response using Zod schema
      const validatedResult = DirectDebitContractResponseSchema.parse(rawResult);

      if (validatedResult.data && validatedResult.data.code !== 100) {
        createZarinPalHTTPException('contract request', HttpStatusCodes.BAD_REQUEST, validatedResult.data?.message || 'Unknown error');
      }

      if (!validatedResult.data?.payman_authority) {
        createZarinPalHTTPException('contract request', HttpStatusCodes.BAD_REQUEST, validatedResult.data?.message || 'Unknown error');
      }

      return validatedResult;
    } catch (error) {
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
    // Return mock data in development with placeholder ID
    if (this.config.isPlaceholder) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Development mode: Using placeholder ZarinPal credentials. Please configure real merchant ID for actual payments.',
      });
    }

    try {
      const rawResult = await this.get<BankListResponse>(
        '/pg/v4/payman/banksList.json',
        {},
        'get bank list',
      );

      // Validate response using Zod schema
      const validatedResult = BankListResponseSchema.parse(rawResult);
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
    // Validate input using Zod schema
    const validatedRequest = SignatureRequestSchema.parse(request);

    // Return mock data in development with placeholder ID
    if (this.config.isPlaceholder) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Development mode: Using placeholder ZarinPal credentials. Please configure real merchant ID for actual payments.',
      });
    }

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
   * Note: You still need to create regular payment authority first
   */
  async executeDirectTransaction(request: DirectTransactionRequest): Promise<DirectTransactionResponse> {
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
