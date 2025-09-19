/**
 * Enhanced Toast Management System
 * Prevents duplicate toasts, provides centralized control, and supports advanced features
 */

// import { AlertCircle, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';
import React from 'react';

import type { ToastActionElement } from '@/components/ui/toast';
import { ToastAction } from '@/components/ui/toast';
import { toast as baseToast } from '@/components/ui/use-toast';

// Global toast tracking and management
const activeToasts = new Set<string>();
const toastTimeouts = new Map<string, NodeJS.Timeout>();
const progressToasts = new Map<string, { progress: number; callback?: ToastProgressCallback }>();
const toastQueue: ToastOptions[] = [];
let isProcessingQueue = false;
let maxConcurrentToasts = 3;

// Toast type icons mapping (for future use)
// const _TOAST_ICONS: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
//   default: Info,
//   destructive: AlertCircle,
//   success: CheckCircle,
//   warning: AlertTriangle,
//   info: Info,
//   loading: Loader2,
// };

export type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info' | 'loading';

export type ToastOptions = {
  id?: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  preventDuplicates?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ComponentType<{ className?: string }>;
  dismissible?: boolean;
  position?: 'top-center' | 'top-right' | 'bottom-center' | 'bottom-right';
};

type ToastProgressCallback = (progress: number) => void;

export type ProgressToastOptions = Omit<ToastOptions, 'duration'> & {
  onProgress?: ToastProgressCallback;
  onComplete?: () => void;
  onError?: (error: Error) => void;
};

/**
 * Create a unique toast identifier based on content
 */
function createToastId(title: string, description?: string): string {
  return `${title}-${description || ''}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

/**
 * Process toast queue to respect concurrent limits
 */
function processToastQueue(): void {
  if (isProcessingQueue || toastQueue.length === 0)
    return;
  if (activeToasts.size >= maxConcurrentToasts)
    return;

  isProcessingQueue = true;
  const nextToast = toastQueue.shift();

  if (nextToast) {
    showToastInternal(nextToast);
    // Process next toast after a small delay
    setTimeout(() => {
      isProcessingQueue = false;
      processToastQueue();
    }, 100);
  } else {
    isProcessingQueue = false;
  }
}

/**
 * Internal toast function with queue management
 */
function showToastInternal(options: ToastOptions): void {
  const {
    id,
    title = '',
    description = '',
    variant = 'default',
    duration = variant === 'loading' ? 0 : 5000,
    preventDuplicates = true,
    action,
    icon: _icon,
    dismissible: _dismissible = true,
  } = options;

  const toastId = id || createToastId(title, description);

  // Prevent duplicate toasts if enabled
  if (preventDuplicates && activeToasts.has(toastId)) {
    return;
  }

  // Clear any existing timeout for this toast
  const existingTimeout = toastTimeouts.get(toastId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Mark toast as active
  activeToasts.add(toastId);

  // Enhanced toast configuration
  const toastConfig: Parameters<typeof baseToast>[0] = {
    title,
    description,
    variant: variant === 'success' || variant === 'warning' || variant === 'info' || variant === 'loading'
      ? 'default'
      : variant,
    duration,
    action: action
      ? (React.createElement(ToastAction, {
          altText: action.label,
          onClick: action.onClick,
        }, action.label) as unknown as ToastActionElement)
      : undefined,
  };

  // Show the toast
  baseToast(toastConfig);

  // Auto-remove from active set after duration (if not persistent)
  if (duration > 0) {
    const timeout = setTimeout(() => {
      activeToasts.delete(toastId);
      toastTimeouts.delete(toastId);
      processToastQueue(); // Process next toast in queue
    }, duration);

    toastTimeouts.set(toastId, timeout);
  }
}

/**
 * Enhanced toast function that prevents duplicates and manages queue
 */
export function toast(options: ToastOptions): string {
  const toastId = options.id || createToastId(options.title || '', options.description);

  // Add to queue if we're at capacity, otherwise show immediately
  if (activeToasts.size >= maxConcurrentToasts) {
    toastQueue.push(options);
  } else {
    showToastInternal(options);
  }

  return toastId;
}

/**
 * Create a progress toast that can be updated
 */
export function createProgressToast(options: ProgressToastOptions): {
  updateProgress: (progress: number) => void;
  complete: () => void;
  error: (error: Error) => void;
  dismiss: () => void;
} {
  const toastId = options.id || createToastId(options.title || '', 'progress');

  // Initial progress toast
  const progressData = { progress: 0, callback: options.onProgress };
  progressToasts.set(toastId, progressData);

  showToastInternal({
    ...options,
    id: toastId,
    variant: 'loading',
    duration: 0, // Persistent until manually dismissed
    dismissible: false,
  });

  return {
    updateProgress: (progress: number) => {
      const data = progressToasts.get(toastId);
      if (data) {
        data.progress = progress;
        data.callback?.(progress);
        // Update toast content with progress
        showToastInternal({
          ...options,
          id: toastId,
          description: `${options.description} (${Math.round(progress)}%)`,
          variant: 'loading',
          duration: 0,
          dismissible: false,
        });
      }
    },
    complete: () => {
      progressToasts.delete(toastId);
      dismissToast(toastId);
      options.onComplete?.();
      // Show completion toast
      toast({
        title: options.title,
        description: `${options.description} - Completed`,
        variant: 'success',
        duration: 3000,
      });
    },
    error: (error: Error) => {
      progressToasts.delete(toastId);
      dismissToast(toastId);
      options.onError?.(error);
      // Show error toast
      toast({
        title: options.title,
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    },
    dismiss: () => {
      progressToasts.delete(toastId);
      dismissToast(toastId);
    },
  };
}

/**
 * Dismiss a specific toast
 */
export function dismissToast(toastId: string): void {
  const timeout = toastTimeouts.get(toastId);
  if (timeout) {
    clearTimeout(timeout);
    toastTimeouts.delete(toastId);
  }
  activeToasts.delete(toastId);
  progressToasts.delete(toastId);
  processToastQueue();
}

/**
 * Enhanced toast manager with comprehensive functionality
 */
export const toastManager = {
  // Basic toast types
  success: (message: string, description?: string, options?: Partial<ToastOptions>) => {
    return toast({
      title: message,
      description,
      variant: 'success',
      preventDuplicates: true,
      ...options,
    });
  },

  error: (message: string, description?: string, options?: Partial<ToastOptions>) => {
    return toast({
      title: message,
      description,
      variant: 'destructive',
      preventDuplicates: true,
      duration: 8000, // Longer duration for errors
      ...options,
    });
  },

  warning: (message: string, description?: string, options?: Partial<ToastOptions>) => {
    return toast({
      title: message,
      description,
      variant: 'warning',
      preventDuplicates: true,
      ...options,
    });
  },

  info: (message: string, description?: string, options?: Partial<ToastOptions>) => {
    return toast({
      title: message,
      description,
      variant: 'info',
      preventDuplicates: true,
      ...options,
    });
  },

  loading: (message: string = 'Loading...', description?: string, options?: Partial<ToastOptions>) => {
    return toast({
      title: message,
      description,
      variant: 'loading',
      duration: 0, // Persistent until dismissed
      dismissible: false,
      preventDuplicates: true,
      ...options,
    });
  },

  // Advanced toast types
  promise: async <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: (data: T) => string;
      error: (error: Error) => string;
    },
    options?: Partial<ProgressToastOptions>,
  ): Promise<T> => {
    const progressToast = createProgressToast({
      title: messages.loading,
      description: 'Processing...',
      ...options,
    });

    try {
      const result = await promise;
      progressToast.complete();
      toastManager.success(messages.success(result));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      progressToast.error(error instanceof Error ? error : new Error(errorMessage));
      toastManager.error(messages.error(error instanceof Error ? error : new Error(errorMessage)));
      throw error;
    }
  },

  // Action toast with buttons
  action: (message: string, actionLabel: string, actionFn: () => void, options?: Partial<ToastOptions>) => {
    return toast({
      title: message,
      variant: 'info',
      action: {
        label: actionLabel,
        onClick: actionFn,
      },
      duration: 10000, // Longer duration for action toasts
      ...options,
    });
  },

  // Undo toast pattern
  undo: (message: string, undoFn: () => void, options?: Partial<ToastOptions>) => {
    return toastManager.action(message, 'Undo', undoFn, {
      variant: 'warning',
      ...options,
    });
  },

  // Retry toast pattern
  retry: (message: string, retryFn: () => void, options?: Partial<ToastOptions>) => {
    return toastManager.action(message, 'Retry', retryFn, {
      variant: 'destructive',
      ...options,
    });
  },

  // Persistent toast (no auto-dismiss)
  persistent: (message: string, description?: string, options?: Partial<ToastOptions>) => {
    return toast({
      title: message,
      description,
      variant: 'info',
      duration: 0,
      dismissible: true,
      ...options,
    });
  },

  // Update an existing toast
  update: (toastId: string, options: Partial<ToastOptions>) => {
    if (activeToasts.has(toastId)) {
      toast({ ...options, id: toastId, preventDuplicates: false });
    }
  },

  // Utility methods
  force: (options: ToastOptions) => {
    return toast({ ...options, preventDuplicates: false });
  },

  dismiss: (toastId: string) => {
    dismissToast(toastId);
  },

  clear: () => {
    activeToasts.clear();
    toastTimeouts.forEach(timeout => clearTimeout(timeout));
    toastTimeouts.clear();
    progressToasts.clear();
    toastQueue.length = 0;
  },

  isActive: (id: string) => {
    return activeToasts.has(id);
  },

  getActiveCount: () => {
    return activeToasts.size;
  },

  getQueueLength: () => {
    return toastQueue.length;
  },

  setMaxConcurrent: (max: number) => {
    maxConcurrentToasts = Math.max(1, max);
    processToastQueue();
  },

  // Progress toast helper
  progress: (options: ProgressToastOptions) => {
    return createProgressToast(options);
  },
};

// Export additional utilities
// (createProgressToast is already exported above)
export default toastManager;

// Auto-process queue when module loads
if (typeof window !== 'undefined') {
  // Set up periodic queue processing
  setInterval(processToastQueue, 500);
}
