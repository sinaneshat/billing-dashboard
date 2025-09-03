/**
 * ZarinPal API Integration Service
 * Migrated to use BaseService pattern for consistent error handling and HTTP utilities
 */

import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { ServiceConfig } from '@/api/patterns/service-factory';
import { BaseService } from '@/api/patterns/service-factory';

export type ZarinPalConfig = ServiceConfig & {
  merchantId: string;
  accessToken: string;
  isSandbox?: boolean;
};

export type PaymentRequest = {
  amount: number;
  currency: 'IRR';
  description: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

export type VerifyRequest = {
  authority: string;
  amount: number;
};

export type DirectDebitRequest = {
  amount: number;
  currency: 'IRR';
  description: string;
  card_hash: string;
  metadata?: Record<string, unknown>;
};

export type PaymentResponse = {
  data?: {
    code: number;
    message: string;
    authority?: string;
    ref_id?: number;
    card_hash?: string;
    card_pan?: string;
    fee_type?: string;
    fee?: number;
  };
  errors?: unknown;
};

export type VerifyResponse = {
  data?: {
    code: number;
    message: string;
    card_hash?: string;
    card_pan?: string;
    ref_id?: number;
    fee_type?: string;
    fee?: number;
  };
  errors?: unknown;
};

/**
 * ZarinPal Service Class
 * Extends BaseService for consistent HTTP handling, error management, and circuit breaking
 */
export class ZarinPalService extends BaseService<ZarinPalConfig> {
  constructor(config: ZarinPalConfig) {
    super(config);
  }

  /**
   * Get service configuration from environment with validation
   */
  static getConfig(env: CloudflareEnv): ZarinPalConfig {
    // Validate ZarinPal specific configuration
    if (!env.ZARINPAL_MERCHANT_ID || !env.ZARINPAL_ACCESS_TOKEN) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'ZarinPal credentials not configured. Set ZARINPAL_MERCHANT_ID and ZARINPAL_ACCESS_TOKEN.',
      });
    }

    const merchantId = env.ZARINPAL_MERCHANT_ID;
    const accessToken = env.ZARINPAL_ACCESS_TOKEN;
    const isSandbox = env.NODE_ENV === 'development';

    return {
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
  }

  /**
   * Request payment from ZarinPal
   * Using BaseService HTTP methods for consistent error handling and retries
   */
  async requestPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const payload = {
      merchant_id: this.config.merchantId,
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      callback_url: request.callbackUrl,
      metadata: request.metadata,
    };

    try {
      const result = await this.post<typeof payload, PaymentResponse>(
        '/pg/v4/payment/request.json',
        payload,
        {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
        'request payment',
      );

      // Validate response and handle ZarinPal error codes
      if (result.data && result.data.code !== 100) {
        const errorMessage = this.getZarinPalErrorMessage(result.data.code);
        throw new HTTPException(HttpStatusCodes.PAYMENT_REQUIRED, {
          message: `Payment request failed: ${errorMessage} (Code: ${result.data.code})`,
        });
      }

      return result;
    } catch (error) {
      throw this.handleError(error, 'request payment', { payload });
    }
  }

  /**
   * Verify payment with ZarinPal
   * Using BaseService HTTP methods for consistent error handling and retries
   */
  async verifyPayment(request: VerifyRequest): Promise<VerifyResponse> {
    const payload = {
      merchant_id: this.config.merchantId,
      authority: request.authority,
      amount: request.amount,
    };

    try {
      const result = await this.post<typeof payload, VerifyResponse>(
        '/pg/v4/payment/verify.json',
        payload,
        {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
        'verify payment',
      );

      // Validate response structure
      if (!result.data) {
        throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
          message: 'Invalid verification response format from ZarinPal',
        });
      }

      // Note: Don't throw error for verification codes here as they need to be handled by calling code
      return result;
    } catch (error) {
      throw this.handleError(error, 'verify payment', { payload });
    }
  }

  /**
   * Process direct debit payment for recurring subscriptions
   * Using BaseService HTTP methods with limited retries to avoid duplicate charges
   */
  async directDebitPayment(request: DirectDebitRequest): Promise<PaymentResponse> {
    // Validate card hash before processing
    if (!request.card_hash || request.card_hash.length < 10) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Invalid card hash for direct debit payment',
      });
    }

    // Validate amount (minimum 1000 IRR as per ZarinPal guidelines)
    if (request.amount < 1000) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Minimum payment amount is 1000 IRR for direct debit',
      });
    }

    const payload = {
      merchant_id: this.config.merchantId,
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      card_hash: request.card_hash,
      metadata: {
        payment_type: 'direct_debit',
        ...request.metadata,
      },
    };

    try {
      // Use makeRequest with custom config for limited retries on direct debit
      const result = await this.makeRequest<PaymentResponse>(
        '/pg/v4/payment/request.json',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
          body: JSON.stringify(payload),
        },
        'direct debit payment',
      );

      // Validate response structure
      if (!result.data) {
        throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
          message: 'Invalid response format from ZarinPal',
        });
      }

      // Handle ZarinPal specific error codes
      if (result.data.code !== 100 && result.data.code !== 101) {
        const errorMessage = this.getZarinPalErrorMessage(result.data.code);
        throw new HTTPException(HttpStatusCodes.PAYMENT_REQUIRED, {
          message: `Direct debit failed: ${errorMessage} (Code: ${result.data.code})`,
        });
      }

      return result;
    } catch (error) {
      throw this.handleError(error, 'direct debit payment', { payload });
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

// Note: Use ZarinPalService.create(env) with proper Cloudflare environment
// This follows proper env pattern for Cloudflare Workers
