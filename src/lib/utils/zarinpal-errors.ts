/**
 * ZarinPal Error Code Mapping and Translation Utilities
 * Based on official ZarinPal API documentation
 * Integrates with structured logging following codebase patterns
 */

import type { ZarinPalErrorCode } from '@/api/common/zarinpal-schemas';

import { logZarinPalError } from './error-logging';

type ZarinPalError = {
  code: ZarinPalErrorCode;
  titleKey: string;
  messageKey: string;
  actionKey: string;
  severity: 'error' | 'warning' | 'info';
};

const ZARINPAL_ERROR_MAP: Record<ZarinPalErrorCode, ZarinPalError> = {
  '-9': {
    code: '-9',
    titleKey: 'zarinpal.errors.-9.title',
    messageKey: 'zarinpal.errors.-9.message',
    actionKey: 'zarinpal.errors.-9.action',
    severity: 'error',
  },
  '-10': {
    code: '-10',
    titleKey: 'zarinpal.errors.-10.title',
    messageKey: 'zarinpal.errors.-10.message',
    actionKey: 'zarinpal.errors.-10.action',
    severity: 'error',
  },
  '-11': {
    code: '-11',
    titleKey: 'zarinpal.errors.-11.title',
    messageKey: 'zarinpal.errors.-11.message',
    actionKey: 'zarinpal.errors.-11.action',
    severity: 'error',
  },
  '-12': {
    code: '-12',
    titleKey: 'zarinpal.errors.-12.title',
    messageKey: 'zarinpal.errors.-12.message',
    actionKey: 'zarinpal.errors.-12.action',
    severity: 'warning',
  },
  '-15': {
    code: '-15',
    titleKey: 'zarinpal.errors.-15.title',
    messageKey: 'zarinpal.errors.-15.message',
    actionKey: 'zarinpal.errors.-15.action',
    severity: 'error',
  },
  '-16': {
    code: '-16',
    titleKey: 'zarinpal.errors.-16.title',
    messageKey: 'zarinpal.errors.-16.message',
    actionKey: 'zarinpal.errors.-16.action',
    severity: 'error',
  },
  '-17': {
    code: '-17',
    titleKey: 'zarinpal.errors.-17.title',
    messageKey: 'zarinpal.errors.-17.message',
    actionKey: 'zarinpal.errors.-17.action',
    severity: 'error',
  },
  '-30': {
    code: '-30',
    titleKey: 'zarinpal.errors.-30.title',
    messageKey: 'zarinpal.errors.-30.message',
    actionKey: 'zarinpal.errors.-30.action',
    severity: 'error',
  },
  '-31': {
    code: '-31',
    titleKey: 'zarinpal.errors.-31.title',
    messageKey: 'zarinpal.errors.-31.message',
    actionKey: 'zarinpal.errors.-31.action',
    severity: 'error',
  },
  '-33': {
    code: '-33',
    titleKey: 'zarinpal.errors.-33.title',
    messageKey: 'zarinpal.errors.-33.message',
    actionKey: 'zarinpal.errors.-33.action',
    severity: 'error',
  },
  '-34': {
    code: '-34',
    titleKey: 'zarinpal.errors.-34.title',
    messageKey: 'zarinpal.errors.-34.message',
    actionKey: 'zarinpal.errors.-34.action',
    severity: 'error',
  },
  '-40': {
    code: '-40',
    titleKey: 'zarinpal.errors.-40.title',
    messageKey: 'zarinpal.errors.-40.message',
    actionKey: 'zarinpal.errors.-40.action',
    severity: 'error',
  },
  '-41': {
    code: '-41',
    titleKey: 'zarinpal.errors.-41.title',
    messageKey: 'zarinpal.errors.-41.message',
    actionKey: 'zarinpal.errors.-41.action',
    severity: 'error',
  },
  '-42': {
    code: '-42',
    titleKey: 'zarinpal.errors.-42.title',
    messageKey: 'zarinpal.errors.-42.message',
    actionKey: 'zarinpal.errors.-42.action',
    severity: 'warning',
  },
  '-50': {
    code: '-50',
    titleKey: 'zarinpal.errors.-50.title',
    messageKey: 'zarinpal.errors.-50.message',
    actionKey: 'zarinpal.errors.-50.action',
    severity: 'warning',
  },
  '-51': {
    code: '-51',
    titleKey: 'zarinpal.errors.-51.title',
    messageKey: 'zarinpal.errors.-51.message',
    actionKey: 'zarinpal.errors.-51.action',
    severity: 'info',
  },
  '-52': {
    code: '-52',
    titleKey: 'zarinpal.errors.-52.title',
    messageKey: 'zarinpal.errors.-52.message',
    actionKey: 'zarinpal.errors.-52.action',
    severity: 'error',
  },
  '-53': {
    code: '-53',
    titleKey: 'zarinpal.errors.-53.title',
    messageKey: 'zarinpal.errors.-53.message',
    actionKey: 'zarinpal.errors.-53.action',
    severity: 'info',
  },
  '-54': {
    code: '-54',
    titleKey: 'zarinpal.errors.-54.title',
    messageKey: 'zarinpal.errors.-54.message',
    actionKey: 'zarinpal.errors.-54.action',
    severity: 'error',
  },
  '-74': {
    code: '-74',
    titleKey: 'zarinpal.errors.-74.title',
    messageKey: 'zarinpal.errors.-74.message',
    actionKey: 'zarinpal.errors.-74.action',
    severity: 'error',
  },
  '-80': {
    code: '-80',
    titleKey: 'zarinpal.errors.-80.title',
    messageKey: 'zarinpal.errors.-80.message',
    actionKey: 'zarinpal.errors.-80.action',
    severity: 'error',
  },
  '100': {
    code: '100',
    titleKey: 'zarinpal.errors.100.title',
    messageKey: 'zarinpal.errors.100.message',
    actionKey: 'zarinpal.errors.100.action',
    severity: 'info',
  },
  '101': {
    code: '101',
    titleKey: 'zarinpal.errors.101.title',
    messageKey: 'zarinpal.errors.101.message',
    actionKey: 'zarinpal.errors.101.action',
    severity: 'info',
  },
};

/**
 * Parse ZarinPal error from API response and return user-friendly error information
 * Includes structured logging following codebase patterns
 */
export function parseZarinPalError(
  error: unknown,
  t?: (key: string) => string,
  context?: {
    operation?: string;
    userId?: string;
    mobile?: string;
    amount?: number;
  },
): {
    code: ZarinPalErrorCode | null;
    titleKey: string;
    messageKey: string;
    actionKey: string;
    userMessage: string;
    technicalMessage: string;
    actionRequired: string;
    severity: 'error' | 'warning' | 'info';
  } {
  let code: ZarinPalErrorCode | null = null;
  let technicalMessage = 'Unknown error occurred';

  // Try to extract error code from different possible formats
  if (typeof error === 'object' && error !== null) {
    // Direct error code (convert to string format)
    if ('code' in error && typeof error.code === 'number') {
      code = error.code.toString() as ZarinPalErrorCode;
    } else if ('code' in error && typeof error.code === 'string') {
      code = error.code as ZarinPalErrorCode;
    }

    // Error message with embedded code
    if ('message' in error && typeof error.message === 'string') {
      technicalMessage = error.message;

      // Extract code from message like "Code: -74" or "error code -80"
      const codeMatch = error.message.match(/[Cc]ode[:\s]*(-?\d+)/);
      if (codeMatch && codeMatch[1]) {
        code = codeMatch[1] as ZarinPalErrorCode;
      }
    }

    // ZarinPal response format
    if ('errors' in error && 'code' in error && (typeof error.code === 'number' || typeof error.code === 'string')) {
      code = (typeof error.code === 'number' ? error.code.toString() : error.code) as ZarinPalErrorCode;
      const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
      const errors = JSON.stringify(error.errors);
      technicalMessage = message || errors;
    }
  } else if (typeof error === 'string') {
    technicalMessage = error;

    // Try to extract code from string
    const codeMatch = error.match(/[Cc]ode[:\s]*(-?\d+)/);
    if (codeMatch && codeMatch[1]) {
      code = codeMatch[1] as ZarinPalErrorCode;
    }
  }

  // Get mapped error information
  const errorInfo = code !== null ? ZARINPAL_ERROR_MAP[code] : null;

  // Use translation function if provided, otherwise fallback to default messages
  const titleKey = errorInfo?.titleKey || 'zarinpal.errors.unknown.title';
  const messageKey = errorInfo?.messageKey || 'zarinpal.errors.unknown.message';
  const actionKey = errorInfo?.actionKey || 'zarinpal.errors.unknown.action';

  const result = {
    code,
    titleKey,
    messageKey,
    actionKey,
    userMessage: t ? t(messageKey) : 'An unexpected payment error occurred. Please try again or contact support.',
    technicalMessage,
    actionRequired: t ? t(actionKey) : 'Contact technical support for assistance',
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
export function getZarinPalErrorMessage(error: unknown, t?: (key: string) => string): string {
  const parsed = parseZarinPalError(error, t);
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
