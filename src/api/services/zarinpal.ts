/**
 * ZarinPal Direct Debit API Integration Service
 * Following reference project service patterns exactly
 */

import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export type ZarinPalConfig = {
  merchantId: string;
  accessToken: string;
  baseUrl?: string;
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
 * Handles payment gateway integration for subscription billing
 * Following reference project service patterns exactly
 */
export class ZarinPalService {
  constructor(private config: ZarinPalConfig) {}

  /**
   * Create ZarinPal service with environment validation
   * Production-ready implementation with comprehensive validation
   */
  static create(env: { ZARINPAL_MERCHANT_ID?: string; ZARINPAL_ACCESS_TOKEN?: string; NODE_ENV?: string }): ZarinPalService {
    // Validate ZarinPal specific configuration
    if (!env.ZARINPAL_MERCHANT_ID || !env.ZARINPAL_ACCESS_TOKEN) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'ZarinPal credentials not configured. Set ZARINPAL_MERCHANT_ID and ZARINPAL_ACCESS_TOKEN.',
      });
    }

    const merchantId = env.ZARINPAL_MERCHANT_ID;
    const accessToken = env.ZARINPAL_ACCESS_TOKEN;

    console.error(`[ZARINPAL] Initializing service for ${env.NODE_ENV} environment`);

    return new ZarinPalService({
      merchantId,
      accessToken,
      isSandbox: env.NODE_ENV === 'development',
    });
  }

  private getBaseUrl(): string {
    if (this.config.baseUrl) {
      return this.config.baseUrl;
    }
    return this.config.isSandbox
      ? 'https://sandbox.zarinpal.com'
      : 'https://api.zarinpal.com';
  }

  /**
   * Request payment from ZarinPal
   * Production-ready implementation with comprehensive error handling
   */
  async requestPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const url = `${this.getBaseUrl()}/pg/v4/payment/request.json`;

      const payload = {
        merchant_id: this.config.merchantId,
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        callback_url: request.callbackUrl,
        metadata: request.metadata,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`,
          'User-Agent': 'DeadPixel-BillingDashboard/1.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorBody = await response.text();
          errorDetails = errorBody ? ` - ${errorBody}` : '';
        } catch {
          // Ignore error parsing errors
        }

        if (response.status === 401) {
          throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
            message: 'ZarinPal authentication failed. Check merchant credentials.',
          });
        } else if (response.status === 403) {
          throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
            message: 'Payment request not allowed for this merchant.',
          });
        }

        throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
          message: `ZarinPal request payment failed: HTTP ${response.status}${errorDetails}`,
        });
      }

      const result: PaymentResponse = await response.json();

      // Validate response and handle ZarinPal error codes
      if (result.data && result.data.code !== 100) {
        const errorMessage = this.getZarinPalErrorMessage(result.data.code);
        throw new HTTPException(HttpStatusCodes.PAYMENT_REQUIRED, {
          message: `Payment request failed: ${errorMessage} (Code: ${result.data.code})`,
        });
      }

      return result;
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Failed to request payment from ZarinPal',
      });
    }
  }

  /**
   * Verify payment with ZarinPal
   * Production-ready implementation with comprehensive error handling
   */
  async verifyPayment(request: VerifyRequest): Promise<VerifyResponse> {
    try {
      const url = `${this.getBaseUrl()}/pg/v4/payment/verify.json`;

      const payload = {
        merchant_id: this.config.merchantId,
        authority: request.authority,
        amount: request.amount,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`,
          'User-Agent': 'DeadPixel-BillingDashboard/1.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorBody = await response.text();
          errorDetails = errorBody ? ` - ${errorBody}` : '';
        } catch {
          // Ignore error parsing errors
        }

        if (response.status === 401) {
          throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
            message: 'ZarinPal authentication failed. Check merchant credentials.',
          });
        }

        throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
          message: `ZarinPal verify payment failed: HTTP ${response.status}${errorDetails}`,
        });
      }

      const result: VerifyResponse = await response.json();

      // Validate response structure
      if (!result.data) {
        throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
          message: 'Invalid verification response format from ZarinPal',
        });
      }

      // Note: Don't throw error for verification codes here as they need to be handled by calling code
      return result;
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Failed to verify payment with ZarinPal',
      });
    }
  }

  /**
   * Process direct debit payment for recurring subscriptions
   * Production-ready implementation following ZarinPal Direct Payment API
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

    try {
      // Use correct ZarinPal direct payment endpoint
      const url = `${this.getBaseUrl()}/pg/v4/payment/request.json`;

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

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`,
          'User-Agent': 'DeadPixel-BillingDashboard/1.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorBody = await response.text();
          errorDetails = errorBody ? ` - ${errorBody}` : '';
        } catch {
          // Ignore error parsing errors
        }

        // Handle specific HTTP status codes
        if (response.status === 401) {
          throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
            message: 'ZarinPal authentication failed. Check merchant credentials.',
          });
        } else if (response.status === 403) {
          throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
            message: 'Direct debit not enabled for this merchant. Contact ZarinPal support.',
          });
        } else if (response.status === 429) {
          throw new HTTPException(HttpStatusCodes.TOO_MANY_REQUESTS, {
            message: 'Rate limit exceeded. Please try again later.',
          });
        }

        throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
          message: `ZarinPal direct debit failed: HTTP ${response.status}${errorDetails}`,
        });
      }

      const result: PaymentResponse = await response.json();

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
      if (error instanceof HTTPException) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new HTTPException(HttpStatusCodes.SERVICE_UNAVAILABLE, {
          message: 'Unable to connect to ZarinPal payment gateway',
        });
      }

      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: `Direct debit payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
   * Production-ready implementation
   */
  getPaymentUrl(authority: string): string {
    return `${this.getBaseUrl()}/pg/StartPay/${authority}`;
  }
}

// Note: Use ZarinPalService.create(env) with proper Cloudflare environment
// This follows proper env pattern for Cloudflare Workers
