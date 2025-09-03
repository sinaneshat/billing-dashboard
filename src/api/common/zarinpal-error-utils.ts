/**
 * ZarinPal Error Processing Utilities
 * Following established codebase patterns for error handling
 */

import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { ZarinPalError } from './zarinpal-schemas';
import { ZarinPalErrorSchema } from './zarinpal-schemas';

/**
 * Parse ZarinPal API response and extract error information
 * Follows the established error handling patterns in the codebase
 */
export function parseZarinPalApiResponse(responseText: string): {
  isError: boolean;
  zarinPalError?: ZarinPalError;
  parsedData?: unknown;
} {
  try {
    const parsed = JSON.parse(responseText);

    // Check if response contains ZarinPal error structure
    if (parsed.errors) {
      const errorValidation = ZarinPalErrorSchema.safeParse(parsed.errors);

      if (errorValidation.success) {
        return {
          isError: true,
          zarinPalError: errorValidation.data,
        };
      }
    }

    // Check if this is an error response based on standard patterns
    const isError = !parsed.data || (parsed.data && Object.keys(parsed.data).length === 0 && parsed.errors);

    return {
      isError,
      parsedData: parsed,
      zarinPalError: parsed.errors ? parsed.errors : undefined,
    };
  } catch {
    return {
      isError: true,
    };
  }
}

/**
 * Create structured HTTPException for ZarinPal errors
 * Following established error handling patterns with detailed context
 */
export function createZarinPalHTTPException(
  operation: string,
  httpStatus: number,
  responseText: string,
): never {
  const { isError, zarinPalError } = parseZarinPalApiResponse(responseText);

  if (isError && zarinPalError) {
    const zarinPalCode = zarinPalError.code;
    const zarinPalMessage = zarinPalError.message;

    // Map ZarinPal error codes to appropriate HTTP status codes
    const mappedStatus = mapZarinPalErrorToHttpStatus(zarinPalCode);

    throw new HTTPException(mappedStatus as typeof HttpStatusCodes.BAD_REQUEST | typeof HttpStatusCodes.UNAUTHORIZED | typeof HttpStatusCodes.FORBIDDEN | typeof HttpStatusCodes.NOT_FOUND | typeof HttpStatusCodes.CONFLICT | typeof HttpStatusCodes.UNPROCESSABLE_ENTITY | typeof HttpStatusCodes.TOO_MANY_REQUESTS | typeof HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: `ZarinPal ${operation} failed`,
      cause: {
        provider: 'zarinpal',
        operation,
        zarinpal_code: zarinPalCode,
        zarinpal_message: zarinPalMessage,
        original_http_status: httpStatus,
        response_body: responseText,
      },
    });
  }

  // Fallback for unparseable responses
  throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
    message: `ZarinPal ${operation} failed: Invalid response`,
    cause: {
      provider: 'zarinpal',
      operation,
      original_http_status: httpStatus,
      response_body: responseText,
    },
  });
}

/**
 * Map ZarinPal error codes to appropriate HTTP status codes
 * Based on ZarinPal documentation and common REST patterns
 */
function mapZarinPalErrorToHttpStatus(zarinPalCode: number): number {
  switch (zarinPalCode) {
    case -74: // Invalid merchant ID
      return HttpStatusCodes.UNAUTHORIZED;
    case -80: // Merchant does not have access
      return HttpStatusCodes.FORBIDDEN;
    case -9: // Transaction failure
    case -33: // Transaction not successful
    case -52: // Bank error
      return HttpStatusCodes.BAD_REQUEST;
    case -10: // Invalid IP or merchant
    case -15: // Merchant access denied
    case -40: // Merchant access denied
      return HttpStatusCodes.UNAUTHORIZED;
    case -11: // Merchant is not active
    case -17: // Merchant must be active
      return HttpStatusCodes.SERVICE_UNAVAILABLE;
    case -12: // Attempts limit exceeded
      return HttpStatusCodes.TOO_MANY_REQUESTS;
    case -31: // Transaction not found
    case -34: // Transaction not found
      return HttpStatusCodes.NOT_FOUND;
    case -41: // Invalid amount
      return HttpStatusCodes.BAD_REQUEST;
    case -30: // Service not allowed
      return HttpStatusCodes.FORBIDDEN;
    case -53: // Transaction cancelled
      return HttpStatusCodes.GONE;
    default:
      return HttpStatusCodes.BAD_REQUEST;
  }
}

/**
 * Check if error is a ZarinPal authentication/authorization issue
 */
export function isZarinPalAuthError(zarinPalCode: number): boolean {
  return [-74, -80, -10, -15, -40].includes(zarinPalCode);
}

/**
 * Check if error is a ZarinPal service availability issue
 */
export function isZarinPalServiceError(zarinPalCode: number): boolean {
  return [-11, -17, -30].includes(zarinPalCode);
}

/**
 * Get user-friendly error message for ZarinPal errors
 * Maps technical error codes to actionable user messages
 */
export function getZarinPalUserMessage(zarinPalCode: number): {
  userMessage: string;
  actionRequired: string;
  severity: 'error' | 'warning' | 'info';
} {
  const errorMap: Record<number, { userMessage: string; actionRequired: string; severity: 'error' | 'warning' | 'info' }> = {
    [-9]: {
      userMessage: 'Payment transaction failed. Please try again.',
      actionRequired: 'Retry payment with same or different payment method',
      severity: 'error',
    },
    [-74]: {
      userMessage: 'Payment system configuration error. Please contact support to resolve this issue.',
      actionRequired: 'Contact technical support to update merchant configuration',
      severity: 'error',
    },
    [-80]: {
      userMessage: 'Direct debit service is not activated for this account. Please contact support to enable this feature.',
      actionRequired: 'Request direct debit service activation from ZarinPal support',
      severity: 'error',
    },
    [-11]: {
      userMessage: 'Payment gateway is currently inactive. Please contact support.',
      actionRequired: 'Contact support to activate merchant account',
      severity: 'error',
    },
    [-12]: {
      userMessage: 'Too many payment attempts. Please try again later.',
      actionRequired: 'Wait and retry after some time',
      severity: 'warning',
    },
    [-52]: {
      userMessage: 'Bank processing error occurred. Please try again.',
      actionRequired: 'Retry payment or try different payment method',
      severity: 'error',
    },
    [-53]: {
      userMessage: 'Payment was cancelled by user or system.',
      actionRequired: 'Start new payment if needed',
      severity: 'info',
    },
    100: {
      userMessage: 'Payment verified successfully.',
      actionRequired: 'No action required',
      severity: 'info',
    },
    101: {
      userMessage: 'This payment has already been verified.',
      actionRequired: 'No action required',
      severity: 'info',
    },
  };

  return errorMap[zarinPalCode] || {
    userMessage: 'An unexpected payment error occurred. Please try again or contact support.',
    actionRequired: 'Contact technical support for assistance',
    severity: 'error',
  };
}
