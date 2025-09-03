/**
 * ZarinPal Direct Debit (Payman) API Service
 * Migrated to use BaseService pattern for consistent error handling and HTTP utilities
 * Implementation following official ZarinPal direct debit documentation
 * https://docs.zarinpal.com/paymentGateway/directPayment.html
 */

import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { createZarinPalHTTPException } from '@/api/common/zarinpal-error-utils';
import type { ServiceConfig } from '@/api/patterns/service-factory';
import { BaseService } from '@/api/patterns/service-factory';

export type ZarinPalDirectDebitConfig = ServiceConfig & {
  merchantId: string;
  isSandbox?: boolean;
  isPlaceholder?: boolean; // Indicates using dev placeholder ID
};

/**
 * Direct Debit Contract Request (Step 1: Create Payman)
 * Following ZarinPal Payman API exactly
 */
export type DirectDebitContractRequest = {
  mobile: string;
  ssn?: string; // Optional - Iranian National ID
  expire_at: string; // Contract expiry date "YYYY-MM-DD HH:MM:SS"
  max_daily_count: string; // Maximum daily transactions
  max_monthly_count: string; // Maximum monthly transactions
  max_amount: string; // Maximum transaction amount in Rials
  callback_url: string; // Return URL after contract signing
};

/**
 * Direct Debit Contract Response
 */
export type DirectDebitContractResponse = {
  data?: {
    payman_authority: string; // Contract authority to be stored
    code: number;
    message: string;
  };
  errors?: unknown[];
};

/**
 * Bank List Response for contract signing
 */
export type BankListResponse = {
  data?: {
    banks: Array<{
      name: string;
      slug: string;
      bank_code: string; // Required for contract signing URL
      max_daily_amount: number;
      max_daily_count: number | null;
    }>;
    code: number;
    message: string;
  };
  errors?: unknown[];
};

/**
 * Signature Verification Request (Step 3: Get signature after contract)
 */
export type SignatureRequest = {
  payman_authority: string;
};

/**
 * Signature Response
 */
export type SignatureResponse = {
  data?: {
    signature: string; // 200-character signature to store securely
    code: number;
    message: string;
  };
  errors?: unknown[];
};

/**
 * Direct Transaction Request (Step 4: Execute direct payment)
 */
export type DirectTransactionRequest = {
  authority: string; // Authority from regular payment request
  signature: string; // Signature from contract verification
};

/**
 * Direct Transaction Response
 */
export type DirectTransactionResponse = {
  data?: {
    refrence_id: number; // Transaction reference ID
    amount: number; // Transaction amount
    code: number;
    message: string;
  };
  errors?: unknown[];
};

/**
 * Contract Cancellation Request
 */
export type CancelContractRequest = {
  signature: string;
};

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
   * Get service configuration from environment with validation
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

    return {
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
  }

  /**
   * Step 1: Request Direct Debit Contract (Payman Request)
   * Using BaseService HTTP methods for consistent error handling
   */
  async requestContract(request: DirectDebitContractRequest): Promise<DirectDebitContractResponse> {
    // Return mock data in development with placeholder ID
    if (this.config.isPlaceholder) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Development mode: Using placeholder ZarinPal credentials. Please configure real merchant ID for actual payments.',
      });
    }

    const payload = {
      merchant_id: this.config.merchantId,
      mobile: request.mobile,
      ssn: request.ssn,
      expire_at: request.expire_at,
      max_daily_count: request.max_daily_count,
      max_monthly_count: request.max_monthly_count,
      max_amount: request.max_amount,
      callback_url: request.callback_url,
    };

    try {
      const result = await this.post<typeof payload, DirectDebitContractResponse>(
        '/pg/v4/payman/request.json',
        payload,
        {},
        'contract request',
      );

      if (result.data && result.data.code !== 100) {
        createZarinPalHTTPException('contract request', HttpStatusCodes.BAD_REQUEST, result.data?.message || 'Unknown error');
      }

      if (!result.data?.payman_authority) {
        createZarinPalHTTPException('contract request', HttpStatusCodes.BAD_REQUEST, result.data?.message || 'Unknown error');
      }

      return result;
    } catch (error) {
      throw this.handleError(error, 'request contract', { payload });
    }
  }

  /**
   * Step 2: Get list of available banks for contract signing
   * Using BaseService HTTP methods for consistent error handling
   */
  async getBankList(): Promise<BankListResponse> {
    // Return mock data in development with placeholder ID
    if (this.config.isPlaceholder) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Development mode: Using placeholder ZarinPal credentials. Please configure real merchant ID for actual payments.',
      });
    }

    try {
      const result = await this.get<BankListResponse>(
        '/pg/v4/payman/banksList.json',
        {},
        'get bank list',
      );

      return result;
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
   * Using BaseService HTTP methods for consistent error handling
   */
  async verifyContractAndGetSignature(request: SignatureRequest): Promise<SignatureResponse> {
    // Return mock data in development with placeholder ID
    if (this.config.isPlaceholder) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Development mode: Using placeholder ZarinPal credentials. Please configure real merchant ID for actual payments.',
      });
    }

    const payload = {
      merchant_id: this.config.merchantId,
      payman_authority: request.payman_authority,
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
      throw this.handleError(error, 'verify contract and get signature', { payload });
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
      throw this.handleError(error, 'execute direct transaction', { payload });
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
      throw this.handleError(error, 'cancel contract', { payload });
    }
  }
}
