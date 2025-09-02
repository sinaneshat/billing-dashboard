/**
 * Toast Notification Utilities
 * Consistent toast notifications following established codebase patterns
 */

import { toast } from '@/components/ui/use-toast';

import { logUserError } from './error-logging';

export type ToastOptions = {
  description?: string;
  duration?: number;
  variant?: 'default' | 'destructive' | 'success';
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

  toast({
    title: message,
    variant: 'destructive',
    duration: 5000,
    ...toastOptions,
  });
}

/**
 * Show warning toast with optional logging
 */
export function showWarningToast(
  message: string,
  options?: ToastOptions & ToastContext,
): void {
  const { component, actionType, error, userId, ...toastOptions } = options || {};

  toast({
    title: message,
    variant: 'default',
    duration: 4000,
    ...toastOptions,
  });
}

/**
 * Show success toast
 */
export function showSuccessToast(
  message: string,
  options?: ToastOptions,
): void {
  toast({
    title: message,
    variant: 'default',
    duration: 3000,
    ...options,
  });
}

/**
 * Show info toast
 */
export function showInfoToast(
  message: string,
  options?: ToastOptions,
): void {
  toast({
    title: message,
    variant: 'default',
    duration: 3000,
    ...options,
  });
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
  const toastOptions: ToastOptions & ToastContext = {
    description: actionRequired,
    duration: severity === 'error' ? 8000 : severity === 'warning' ? 6000 : 4000,
    variant: severity === 'error' ? 'destructive' : 'default',
    component: 'zarinpal-payment',
    actionType: options?.operation,
    error: options?.error,
    userId: options?.userId,
  };

  // Log the error with context
  if (toastOptions.component && toastOptions.actionType && toastOptions.error) {
    logUserError(toastOptions.component, toastOptions.actionType, toastOptions.error, { userId: toastOptions.userId });
  }

  toast({ title: userMessage, ...toastOptions });
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
    variant: 'destructive',
  });
}
