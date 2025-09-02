/**
 * ZarinPal Direct Debit (Payman) API Service
 * Implementation following official ZarinPal direct debit documentation
 * https://docs.zarinpal.com/paymentGateway/directPayment.html
 */

import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { createZarinPalHTTPException } from '@/api/common/zarinpal-error-utils';

export type ZarinPalConfig = {
  merchantId: string;
  baseUrl?: string;
  isSandbox?: boolean;
};

/**
 * Direct Debit Contract Request (Step 1: Create Payman)
 * Following ZarinPal Payman API exactly
 */
export type DirectDebitContractRequest = {
  mobile: string;
  ssn?: string; // Optional - کد ملی
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
 * Implements complete Payman (Direct Debit) workflow
 */
export class ZarinPalDirectDebitService {
  constructor(private config: ZarinPalConfig) {}

  /**
   * Create service instance with environment validation
   */
  static create(env: {
    ZARINPAL_MERCHANT_ID?: string;
    NODE_ENV?: string;
  }): ZarinPalDirectDebitService {
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

    // Warn if using placeholder values
    const placeholderPatterns = [
      'YOUR_',
      'your-merchant-id',
      'REPLACE_',
      'PLACEHOLDER',
      '36e0ea98-43fa-400d-a421-f7593b1c73bc', // Known invalid test ID
      'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    ];

    if (placeholderPatterns.some(pattern => env.ZARINPAL_MERCHANT_ID!.includes(pattern))) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Invalid ZarinPal merchant ID. Please replace with your real merchant ID from https://next.zarinpal.com/panel/',
      });
    }

    return new ZarinPalDirectDebitService({
      merchantId: env.ZARINPAL_MERCHANT_ID,
      isSandbox: env.NODE_ENV === 'development',
    });
  }

  private getBaseUrl(): string {
    if (this.config.baseUrl) {
      return this.config.baseUrl;
    }
    // ZarinPal Direct Debit (Payman) API only works on production endpoints
    // No sandbox version available - requires manual activation via ticket
    return 'https://api.zarinpal.com';
  }

  /**
   * Step 1: Request Direct Debit Contract (Payman Request)
   */
  async requestContract(request: DirectDebitContractRequest) {
    try {
      const url = `${this.getBaseUrl()}/pg/v4/payman/request.json`;

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

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'DeadPixel-BillingDashboard/1.0',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        createZarinPalHTTPException('contract request', response.status, responseText);
      }

      let result: DirectDebitContractResponse;
      try {
        result = JSON.parse(responseText);
      } catch {
        createZarinPalHTTPException('contract request', response.status, responseText);
      }

      if (result.data && result.data.code !== 100) {
        createZarinPalHTTPException('contract request', response.status, responseText);
      }

      if (!result.data?.payman_authority) {
        createZarinPalHTTPException('contract request', response.status, responseText);
      }

      return result;
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Failed to request direct debit contract from ZarinPal',
      });
    }
  }

  /**
   * Step 2: Get list of available banks for contract signing
   */
  async getBankList() {
    try {
      const url = `${this.getBaseUrl()}/pg/v4/payman/banksList.json`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DeadPixel-BillingDashboard/1.0',
        },
      });

      if (!response.ok) {
        const responseText = await response.text();
        createZarinPalHTTPException('bank list', response.status, responseText);
      }

      const result: BankListResponse = await response.json();
      return result;
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Failed to get bank list from ZarinPal',
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
   */
  async verifyContractAndGetSignature(request: SignatureRequest) {
    try {
      const url = `${this.getBaseUrl()}/pg/v4/payman/verify.json`;

      const payload = {
        merchant_id: this.config.merchantId,
        payman_authority: request.payman_authority,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'DeadPixel-BillingDashboard/1.0',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        createZarinPalHTTPException('contract verification', response.status, responseText);
      }

      let result: SignatureResponse;
      try {
        result = JSON.parse(responseText);
      } catch {
        createZarinPalHTTPException('contract verification', response.status, responseText);
      }

      if (result.data && result.data.code !== 100) {
        createZarinPalHTTPException('contract verification', response.status, responseText);
      }

      return result;
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Failed to verify contract with ZarinPal',
      });
    }
  }

  /**
   * Step 4: Execute direct transaction using signature
   * Note: You still need to create regular payment authority first
   */
  async executeDirectTransaction(request: DirectTransactionRequest) {
    try {
      const url = `${this.getBaseUrl()}/pg/v4/payman/checkout.json`;

      const payload = {
        merchant_id: this.config.merchantId,
        authority: request.authority,
        signature: request.signature,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'DeadPixel-BillingDashboard/1.0',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        createZarinPalHTTPException('direct transaction', response.status, responseText);
      }

      let result: DirectTransactionResponse;
      try {
        result = JSON.parse(responseText);
      } catch {
        createZarinPalHTTPException('direct transaction', response.status, responseText);
      }

      if (result.data && result.data.code !== 100) {
        createZarinPalHTTPException('direct transaction', response.status, responseText);
      }

      return result;
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Failed to execute direct transaction',
      });
    }
  }

  /**
   * Cancel direct debit contract
   */
  async cancelContract(request: CancelContractRequest) {
    try {
      const url = `${this.getBaseUrl()}/pg/v4/payman/cancelContract.json`;

      const payload = {
        merchant_id: this.config.merchantId,
        signature: request.signature,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'DeadPixel-BillingDashboard/1.0',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        createZarinPalHTTPException('contract cancellation', response.status, responseText);
      }

      let result: { data?: { code: number; message: string } };
      try {
        result = JSON.parse(responseText);
      } catch {
        createZarinPalHTTPException('contract cancellation', response.status, responseText);
      }

      if (result.data && result.data.code !== 100) {
        createZarinPalHTTPException('contract cancellation', response.status, responseText);
      }

      return {
        code: result.data?.code || 0,
        message: result.data?.message || 'Contract cancelled successfully',
      };
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Failed to cancel contract',
      });
    }
  }
}
