/**
 * Toast Notification Utilities
 * Clean utilities for consistent toast messaging
 */

import { toast } from '@/components/ui/use-toast';

/**
 * Show success toast with consistent styling
 */
export function showSuccessToast(message: string, options?: string | { description?: string; [key: string]: unknown }) {
  const description = typeof options === 'string' ? options : options?.description;

  return toast({
    title: 'Success',
    description: message,
    variant: 'default',
    ...(description && { description }),
  });
}

/**
 * Show error toast with consistent styling
 */
export function showErrorToast(message: string, options?: string | { description?: string; [key: string]: unknown }) {
  const description = typeof options === 'string' ? options : options?.description;

  return toast({
    title: 'Error',
    description: message,
    variant: 'destructive',
    ...(description && { description }),
  });
}

/**
 * Show warning toast with consistent styling
 */
export function showWarningToast(message: string, description?: string) {
  return toast({
    title: 'Warning',
    description: message,
    variant: 'default',
    ...(description && { description }),
  });
}

/**
 * Show info toast with consistent styling
 */
export function showInfoToast(message: string, description?: string) {
  return toast({
    title: 'ℹ️ Info',
    description: message,
    variant: 'default',
    ...(description && { description }),
  });
}

/**
 * Show loading toast (useful for async operations)
 */
export function showLoadingToast(message: string = 'Loading...') {
  return toast({
    title: '⏳ Loading',
    description: message,
    variant: 'default',
  });
}
