/**
 * ZarinPal Direct Debit (Payman) API Service
 * Implementation following official ZarinPal direct debit documentation
 * https://docs.zarinpal.com/paymentGateway/directPayment.html
 */

import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

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

    return new ZarinPalDirectDebitService({
      merchantId: env.ZARINPAL_MERCHANT_ID,
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
   * Step 1: Request Direct Debit Contract (Payman Request)
   */
  async requestContract(request: DirectDebitContractRequest): Promise<DirectDebitContractResponse> {
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

      if (!response.ok) {
        throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
          message: `ZarinPal contract request failed: HTTP ${response.status}`,
        });
      }

      const result: DirectDebitContractResponse = await response.json();

      if (result.data && result.data.code !== 100) {
        const errorMessage = this.getZarinPalErrorMessage(result.data.code);
        throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
          message: `Direct debit contract request failed: ${errorMessage} (Code: ${result.data.code})`,
        });
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
  async getBankList(): Promise<BankListResponse> {
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
        throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
          message: `ZarinPal bank list request failed: HTTP ${response.status}`,
        });
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
  async verifyContractAndGetSignature(request: SignatureRequest): Promise<SignatureResponse> {
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

      if (!response.ok) {
        throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
          message: `ZarinPal contract verification failed: HTTP ${response.status}`,
        });
      }

      const result: SignatureResponse = await response.json();

      if (result.data && result.data.code !== 100) {
        const errorMessage = this.getZarinPalErrorMessage(result.data.code);
        throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
          message: `Contract verification failed: ${errorMessage} (Code: ${result.data.code})`,
        });
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
  async executeDirectTransaction(request: DirectTransactionRequest): Promise<DirectTransactionResponse> {
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

      if (!response.ok) {
        throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
          message: `ZarinPal direct transaction failed: HTTP ${response.status}`,
        });
      }

      const result: DirectTransactionResponse = await response.json();

      if (result.data && result.data.code !== 100) {
        const errorMessage = this.getZarinPalErrorMessage(result.data.code);
        throw new HTTPException(HttpStatusCodes.PAYMENT_REQUIRED, {
          message: `Direct transaction failed: ${errorMessage} (Code: ${result.data.code})`,
        });
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
  async cancelContract(request: CancelContractRequest): Promise<{ code: number; message: string }> {
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

      if (!response.ok) {
        throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
          message: `ZarinPal contract cancellation failed: HTTP ${response.status}`,
        });
      }

      const result = await response.json() as { data?: { code: number; message: string } };

      if (result.data && result.data.code !== 100) {
        const errorMessage = this.getZarinPalErrorMessage(result.data.code);
        throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
          message: `Contract cancellation failed: ${errorMessage} (Code: ${result.data.code})`,
        });
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

  /**
   * Get user-friendly error message for ZarinPal error codes
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
      // Success codes
      '100': 'Operation was successful',
      '101': 'Operation was successful, previously verified',
    };

    return errorMessages[code] || `Unknown error (${code})`;
  }
}
