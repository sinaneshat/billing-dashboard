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
   * Factory method to create ZarinPal service from environment
   * Following reference project factory pattern exactly
   */
  static fromEnv(env: { ZARINPAL_MERCHANT_ID?: string; ZARINPAL_ACCESS_TOKEN?: string; NODE_ENV?: string }): ZarinPalService {
    const merchantId = env.ZARINPAL_MERCHANT_ID;
    if (!merchantId) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'ZarinPal merchant ID not configured',
      });
    }

    const accessToken = env.ZARINPAL_ACCESS_TOKEN;
    if (!accessToken) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'ZarinPal access token not configured',
      });
    }

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
   * Following reference project error handling patterns
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
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
          message: `ZarinPal request payment failed: ${response.status} ${response.statusText}`,
        });
      }

      return await response.json();
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
   * Following reference project error handling patterns
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
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
          message: `ZarinPal verify payment failed: ${response.status} ${response.statusText}`,
        });
      }

      return await response.json();
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
   * Following reference project error handling patterns
   */
  async directDebitPayment(request: DirectDebitRequest): Promise<PaymentResponse> {
    try {
      const url = `${this.getBaseUrl()}/pg/v4/payment/directDebit.json`;

      const payload = {
        merchant_id: this.config.merchantId,
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        card_hash: request.card_hash,
        metadata: request.metadata,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
          message: `ZarinPal direct debit failed: ${response.status} ${response.statusText}`,
        });
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Failed to process direct debit payment',
      });
    }
  }

  /**
   * Get payment gateway URL for redirect
   */
  getPaymentUrl(authority: string): string {
    return `${this.getBaseUrl()}/pg/StartPay/${authority}`;
  }
}

// Note: Factory function removed - use ZarinPalService.fromEnv(env) instead
// This follows the reference project pattern exactly
