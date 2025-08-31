/**
 * ZarinPal Direct Debit API Integration Service
 * Simplified with minimal type definitions
 */

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
 */
export class ZarinPalService {
  private config: ZarinPalConfig;

  constructor(config: ZarinPalConfig) {
    this.config = config;
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
   */
  async requestPayment(request: PaymentRequest): Promise<PaymentResponse> {
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

    return response.json();
  }

  /**
   * Verify payment with ZarinPal
   */
  async verifyPayment(request: VerifyRequest): Promise<VerifyResponse> {
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

    return response.json();
  }

  /**
   * Process direct debit payment for recurring subscriptions
   */
  async directDebitPayment(request: DirectDebitRequest): Promise<PaymentResponse> {
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

    return response.json();
  }

  /**
   * Get payment gateway URL for redirect
   */
  getPaymentUrl(authority: string): string {
    return `${this.getBaseUrl()}/pg/StartPay/${authority}`;
  }
}

/**
 * Factory function to create ZarinPal service instance
 */
export function createZarinPalService(config: ZarinPalConfig): ZarinPalService {
  return new ZarinPalService(config);
}
