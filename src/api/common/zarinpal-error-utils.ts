/**
 * ZarinPal Error Processing Utilities
 * Following established codebase patterns for error handling
 */

import { HTTPExceptionFactory } from '@/api/core/http-exceptions';

import type { ZarinPalError } from './zarinpal-schemas';
import { ZarinPalErrorSchema } from './zarinpal-schemas';

/**
 * Parse ZarinPal API response and extract error information
 * Follows the established error handling patterns in the codebase
 */
function parseZarinPalApiResponse(responseText: string): {
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

    // Create type-safe ZarinPal error exception
    throw HTTPExceptionFactory.zarinPalError({
      message: `ZarinPal ${operation} failed: ${zarinPalMessage}`,
      operation,
      zarinpalCode: String(zarinPalCode),
      zarinpalMessage: zarinPalMessage,
      details: {
        original_http_status: httpStatus,
        response_body: responseText,
      },
    });
  }

  // Fallback for unparseable responses
  throw HTTPExceptionFactory.badGateway({
    message: `ZarinPal ${operation} failed: Invalid response`,
    details: {
      provider: 'zarinpal',
      operation,
      original_http_status: httpStatus,
      response_body: responseText,
    },
  });
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
