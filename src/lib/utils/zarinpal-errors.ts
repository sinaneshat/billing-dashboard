/**
 * ZarinPal Error Code Mapping and Translation Utilities
 * Based on official ZarinPal API documentation
 * Integrates with structured logging following codebase patterns
 */

import { logZarinPalError } from './error-logging';

export type ZarinPalErrorCode =
  | -9 // Transaction failure
  | -10 // Invalid IP or merchant
  | -11 // Merchant is not active
  | -12 // Attempts limit exceeded
  | -15 // Merchant access denied
  | -16 // Invalid merchant level
  | -17 // Merchant must be active
  | -30 // Service not allowed
  | -31 // Transaction not found
  | -33 // Transaction not successful
  | -34 // Transaction not found
  | -40 // Merchant access denied
  | -41 // Invalid amount
  | -42 // Refund limit exceeded
  | -50 // Refund limit exceeded
  | -51 // Transaction not refundable
  | -52 // Bank error
  | -53 // Transaction cancelled
  | -54 // Transaction not verified
  | -74 // Invalid merchant ID
  | -80 // Merchant does not have access to direct debit
  | 100 // Verified
  | 101; // Already verified

type ZarinPalError = {
  code: ZarinPalErrorCode;
  englishMessage: string;
  persianMessage: string;
  userFriendlyMessage: string;
  actionRequired: string;
  severity: 'error' | 'warning' | 'info';
};

const ZARINPAL_ERROR_MAP: Record<ZarinPalErrorCode, ZarinPalError> = {
  [-9]: {
    code: -9,
    englishMessage: 'Transaction failure',
    persianMessage: 'خطا در تراکنش',
    userFriendlyMessage: 'Payment transaction failed. Please try again.',
    actionRequired: 'Retry payment with same or different payment method',
    severity: 'error',
  },
  [-10]: {
    code: -10,
    englishMessage: 'Invalid IP or merchant configuration',
    persianMessage: 'آی‌پی یا تنظیمات درگاه نامعتبر',
    userFriendlyMessage: 'Payment system configuration error. Please contact support.',
    actionRequired: 'Contact technical support to verify merchant configuration',
    severity: 'error',
  },
  [-11]: {
    code: -11,
    englishMessage: 'Merchant is not active',
    persianMessage: 'درگاه فعال نیست',
    userFriendlyMessage: 'Payment gateway is currently inactive. Please contact support.',
    actionRequired: 'Contact support to activate merchant account',
    severity: 'error',
  },
  [-12]: {
    code: -12,
    englishMessage: 'Attempts limit exceeded',
    persianMessage: 'تعداد تلاش‌ها بیش از حد مجاز',
    userFriendlyMessage: 'Too many payment attempts. Please try again later.',
    actionRequired: 'Wait and retry after some time',
    severity: 'warning',
  },
  [-15]: {
    code: -15,
    englishMessage: 'Merchant access denied',
    persianMessage: 'دسترسی درگاه مسدود شده',
    userFriendlyMessage: 'Payment gateway access is restricted. Please contact support.',
    actionRequired: 'Contact support to restore merchant access',
    severity: 'error',
  },
  [-16]: {
    code: -16,
    englishMessage: 'Invalid merchant level',
    persianMessage: 'سطح دسترسی درگاه نامعتبر',
    userFriendlyMessage: 'Payment gateway does not support this operation. Please contact support.',
    actionRequired: 'Upgrade merchant account level or contact support',
    severity: 'error',
  },
  [-17]: {
    code: -17,
    englishMessage: 'Merchant must be active',
    persianMessage: 'درگاه باید فعال باشد',
    userFriendlyMessage: 'Payment gateway must be activated first. Please contact support.',
    actionRequired: 'Activate merchant account through ZarinPal',
    severity: 'error',
  },
  [-30]: {
    code: -30,
    englishMessage: 'Service not allowed',
    persianMessage: 'سرویس مجاز نیست',
    userFriendlyMessage: 'This payment service is not available. Please try a different payment method.',
    actionRequired: 'Use alternative payment method or contact support',
    severity: 'error',
  },
  [-31]: {
    code: -31,
    englishMessage: 'Transaction not found',
    persianMessage: 'تراکنش یافت نشد',
    userFriendlyMessage: 'Payment transaction not found. Please start a new payment.',
    actionRequired: 'Start new payment process',
    severity: 'error',
  },
  [-33]: {
    code: -33,
    englishMessage: 'Transaction not successful',
    persianMessage: 'تراکنش ناموفق',
    userFriendlyMessage: 'Payment was not successful. Please try again.',
    actionRequired: 'Retry payment or use different payment method',
    severity: 'error',
  },
  [-34]: {
    code: -34,
    englishMessage: 'Transaction not found',
    persianMessage: 'تراکنش یافت نشد',
    userFriendlyMessage: 'Payment record not found. Please start a new payment.',
    actionRequired: 'Start new payment process',
    severity: 'error',
  },
  [-40]: {
    code: -40,
    englishMessage: 'Merchant access denied',
    persianMessage: 'دسترسی درگاه مسدود',
    userFriendlyMessage: 'Payment gateway access is denied. Please contact support.',
    actionRequired: 'Contact support to restore access',
    severity: 'error',
  },
  [-41]: {
    code: -41,
    englishMessage: 'Invalid amount',
    persianMessage: 'مبلغ نامعتبر',
    userFriendlyMessage: 'Payment amount is invalid. Please check and try again.',
    actionRequired: 'Verify payment amount and retry',
    severity: 'error',
  },
  [-42]: {
    code: -42,
    englishMessage: 'Refund limit exceeded',
    persianMessage: 'حد مجاز برگشت وجه',
    userFriendlyMessage: 'Refund limit has been exceeded for this transaction.',
    actionRequired: 'Contact support for partial refund options',
    severity: 'warning',
  },
  [-50]: {
    code: -50,
    englishMessage: 'Refund limit exceeded',
    persianMessage: 'حد مجاز برگشت وجه تجاوز شده',
    userFriendlyMessage: 'Cannot process refund due to limit restrictions.',
    actionRequired: 'Contact support for refund assistance',
    severity: 'warning',
  },
  [-51]: {
    code: -51,
    englishMessage: 'Transaction not refundable',
    persianMessage: 'تراکنش قابل برگشت نیست',
    userFriendlyMessage: 'This transaction cannot be refunded.',
    actionRequired: 'Contact support if you believe this is an error',
    severity: 'info',
  },
  [-52]: {
    code: -52,
    englishMessage: 'Bank error',
    persianMessage: 'خطا از سمت بانک',
    userFriendlyMessage: 'Bank processing error occurred. Please try again.',
    actionRequired: 'Retry payment or try different payment method',
    severity: 'error',
  },
  [-53]: {
    code: -53,
    englishMessage: 'Transaction cancelled',
    persianMessage: 'تراکنش لغو شده',
    userFriendlyMessage: 'Payment was cancelled by user or system.',
    actionRequired: 'Start new payment if needed',
    severity: 'info',
  },
  [-54]: {
    code: -54,
    englishMessage: 'Transaction not verified',
    persianMessage: 'تراکنش تایید نشده',
    userFriendlyMessage: 'Payment verification failed. Transaction may be incomplete.',
    actionRequired: 'Contact support to verify payment status',
    severity: 'error',
  },
  [-74]: {
    code: -74,
    englishMessage: 'Invalid merchant ID',
    persianMessage: 'شناسه درگاه نامعتبر',
    userFriendlyMessage: 'Payment system configuration error. Please contact support to resolve this issue.',
    actionRequired: 'Contact technical support to update merchant configuration',
    severity: 'error',
  },
  [-80]: {
    code: -80,
    englishMessage: 'Merchant does not have access to direct debit service',
    persianMessage: 'درگاه دسترسی به سرویس برداشت مستقیم ندارد',
    userFriendlyMessage: 'Direct debit service is not activated for this account. Please contact support to enable this feature.',
    actionRequired: 'Request direct debit service activation from ZarinPal support',
    severity: 'error',
  },
  100: {
    code: 100,
    englishMessage: 'Verified successfully',
    persianMessage: 'تایید شده',
    userFriendlyMessage: 'Payment verified successfully.',
    actionRequired: 'No action required',
    severity: 'info',
  },
  101: {
    code: 101,
    englishMessage: 'Transaction already verified',
    persianMessage: 'تراکنش قبلا تایید شده',
    userFriendlyMessage: 'This payment has already been verified.',
    actionRequired: 'No action required',
    severity: 'info',
  },
};

/**
 * Parse ZarinPal error from API response and return user-friendly error information
 * Includes structured logging following codebase patterns
 */
export function parseZarinPalError(
  error: unknown,
  context?: {
    operation?: string;
    userId?: string;
    mobile?: string;
    amount?: number;
  },
): {
    code: ZarinPalErrorCode | null;
    userMessage: string;
    technicalMessage: string;
    actionRequired: string;
    severity: 'error' | 'warning' | 'info';
  } {
  let code: ZarinPalErrorCode | null = null;
  let technicalMessage = 'Unknown error occurred';

  // Try to extract error code from different possible formats
  if (typeof error === 'object' && error !== null) {
    // Direct error code
    if ('code' in error && typeof error.code === 'number') {
      code = error.code as ZarinPalErrorCode;
    }

    // Error message with embedded code
    if ('message' in error && typeof error.message === 'string') {
      technicalMessage = error.message;

      // Extract code from message like "Code: -74" or "error code -80"
      const codeMatch = error.message.match(/[Cc]ode[:\s]*(-?\d+)/);
      if (codeMatch && codeMatch[1]) {
        code = Number.parseInt(codeMatch[1], 10) as ZarinPalErrorCode;
      }
    }

    // ZarinPal response format
    if ('errors' in error && 'code' in error && typeof error.code === 'number') {
      code = error.code as ZarinPalErrorCode;
      const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
      const errors = JSON.stringify(error.errors);
      technicalMessage = message || errors;
    }
  } else if (typeof error === 'string') {
    technicalMessage = error;

    // Try to extract code from string
    const codeMatch = error.match(/[Cc]ode[:\s]*(-?\d+)/);
    if (codeMatch && codeMatch[1]) {
      code = Number.parseInt(codeMatch[1], 10) as ZarinPalErrorCode;
    }
  }

  // Get mapped error information
  const errorInfo = code !== null ? ZARINPAL_ERROR_MAP[code] : null;

  const result = {
    code,
    userMessage: errorInfo?.userFriendlyMessage || 'An unexpected payment error occurred. Please try again or contact support.',
    technicalMessage,
    actionRequired: errorInfo?.actionRequired || 'Contact technical support for assistance',
    severity: errorInfo?.severity || 'error' as 'error' | 'warning' | 'info',
  };

  // Log ZarinPal error with context following codebase patterns
  if (context?.operation) {
    logZarinPalError(context.operation, error, {
      userId: context.userId,
      mobile: context.mobile,
      amount: context.amount,
    });
  }

  return result;
}

/**
 * Get user-friendly error message for display in UI
 */
export function getZarinPalErrorMessage(error: unknown, locale: 'en' | 'fa' = 'en'): string {
  const parsed = parseZarinPalError(error);

  if (parsed.code && ZARINPAL_ERROR_MAP[parsed.code]) {
    const errorInfo = ZARINPAL_ERROR_MAP[parsed.code];
    return locale === 'fa' ? errorInfo.persianMessage : errorInfo.userFriendlyMessage;
  }

  return parsed.userMessage;
}

/**
 * Check if an error is a known ZarinPal error
 */
export function isZarinPalError(error: unknown): boolean {
  const parsed = parseZarinPalError(error);
  return parsed.code !== null && parsed.code in ZARINPAL_ERROR_MAP;
}

/**
 * Get severity level for error (for styling/prioritization)
 */
export function getZarinPalErrorSeverity(error: unknown): 'error' | 'warning' | 'info' {
  return parseZarinPalError(error).severity;
}
