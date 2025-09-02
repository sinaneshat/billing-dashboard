/**
 * Toast Notification Utilities
 * Consistent toast notifications following established codebase patterns
 */

import { toast } from 'sonner';

import { logUserError } from './error-logging';

export type ToastOptions = {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export type ToastContext = {
  component?: string;
  actionType?: string; // Renamed to avoid conflict with toast action
  error?: unknown;
  userId?: string;
};

/**
 * Show error toast with structured logging
 */
export function showErrorToast(
  message: string,
  options?: ToastOptions & ToastContext,
): void {
  const { component, actionType, error, userId, ...toastOptions } = options || {};

  // Log user-facing error if context provided
  if (component && actionType && error) {
    logUserError(component, actionType, error, { userId });
  }

  toast.error(message, toastOptions);
}

/**
 * Show warning toast with optional logging
 */
export function showWarningToast(
  message: string,
  options?: ToastOptions & ToastContext,
): void {
  const { component, actionType, error, userId, ...toastOptions } = options || {};

  toast.warning(message, toastOptions);
}

/**
 * Show success toast
 */
export function showSuccessToast(
  message: string,
  options?: ToastOptions,
): void {
  toast.success(message, options);
}

/**
 * Show info toast
 */
export function showInfoToast(
  message: string,
  options?: ToastOptions,
): void {
  toast.info(message, options);
}

/**
 * Show ZarinPal-specific error toast with enhanced context
 */
export function showZarinPalErrorToast(
  userMessage: string,
  actionRequired: string,
  severity: 'error' | 'warning' | 'info',
  options?: {
    userId?: string;
    operation?: string;
    error?: unknown;
  },
): void {
  const toastOptions: ToastOptions = {
    description: actionRequired,
    duration: severity === 'error' ? 8000 : severity === 'warning' ? 6000 : 4000,
  };

  // Log the error with context
  if (options?.operation && options?.error) {
    logUserError(
      'zarinpal-payment',
      options.operation,
      options.error,
      { userId: options.userId },
    );
  }

  switch (severity) {
    case 'error':
      toast.error(userMessage, toastOptions);
      break;
    case 'warning':
      toast.warning(userMessage, toastOptions);
      break;
    case 'info':
      toast.info(userMessage, toastOptions);
      break;
  }
}

/**
 * Show authentication error toast
 */
export function showAuthErrorToast(
  message: string = 'Please log in to continue',
  options?: ToastContext,
): void {
  showErrorToast(message, {
    ...options,
    duration: 5000,
  });
}
