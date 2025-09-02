/**
 * TanStack Query Helper Utilities
 *
 * Provides utility functions and hooks for better error handling,
 * loading states, and common query patterns.
 */

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useReducer } from 'react';

import { parseErrorObject } from '@/api/common/type-utils';

/**
 * Enhanced error information extracted from API responses
 */
export type QueryError = {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
};

/**
 * Extract standardized error information from query/mutation errors
 */
export function extractErrorInfo(error: unknown): QueryError {
  if (!error) {
    return { message: 'Unknown error occurred' };
  }

  // Handle standard API error response
  if (typeof error === 'object' && error !== null) {
    const err = parseErrorObject(error);

    // Hono RPC error format
    if (err.message) {
      return {
        message: err.message,
        status: err.status,
        code: err.code,
        details: err.details || err.data,
      };
    }

    // Fetch error
    if (err.status) {
      return {
        message: err.statusText || `Request failed with status ${err.status}`,
        status: err.status,
      };
    }
  }

  // Fallback for string errors
  if (typeof error === 'string') {
    return { message: error };
  }

  return { message: 'An unexpected error occurred' };
}

/**
 * Enhanced loading state that includes more granular states
 */
export type LoadingState = {
  isLoading: boolean;
  isInitialLoading: boolean;
  isFetching: boolean;
  isRefetching: boolean;
  isLoadingError: boolean;
  canRetry: boolean;
};

/**
 * Extract comprehensive loading state from query result
 */
export function extractLoadingState(query: UseQueryResult): LoadingState {
  return {
    isLoading: query.isLoading,
    isInitialLoading: query.isLoading && !query.data,
    isFetching: query.isFetching,
    isRefetching: query.isFetching && !query.isLoading,
    isLoadingError: query.isError && query.isLoading,
    canRetry: !!query.error && query.failureCount < 3,
  };
}

/**
 * Hook for standardized error handling across queries
 */
export function useQueryError(query: UseQueryResult) {
  const errorInfo = useMemo(() => {
    return query.error ? extractErrorInfo(query.error) : null;
  }, [query.error]);

  return {
    error: errorInfo,
    hasError: !!query.error,
    isNetworkError: errorInfo?.status === undefined,
    isClientError: (errorInfo?.status ?? 0) >= 400 && (errorInfo?.status ?? 0) < 500,
    isServerError: (errorInfo?.status ?? 0) >= 500,
    canRetry: query.failureCount < 3,
    retry: query.refetch,
  };
}

/**
 * Hook for mutation error handling with toast integration ready
 */
export function useMutationError<TData, TError, TVariables>(
  mutation: UseMutationResult<TData, TError, TVariables>,
) {
  const errorInfo = useMemo(() => {
    return mutation.error ? extractErrorInfo(mutation.error) : null;
  }, [mutation.error]);

  return {
    error: errorInfo,
    hasError: !!mutation.error,
    isNetworkError: errorInfo?.status === undefined,
    isClientError: (errorInfo?.status ?? 0) >= 400 && (errorInfo?.status ?? 0) < 500,
    isServerError: (errorInfo?.status ?? 0) >= 500,
    reset: mutation.reset,
  };
}

/**
 * State and actions for optimistic updates
 */
type OptimisticState<T> = {
  optimisticValue: T;
  isOptimistic: boolean;
};

type OptimisticAction<T> =
  | { type: 'START_OPTIMISTIC'; value: T }
  | { type: 'RESET_OPTIMISTIC' }
  | { type: 'ROLLBACK_OPTIMISTIC'; initialValue: T };

function optimisticReducer<T>(
  state: OptimisticState<T>,
  action: OptimisticAction<T>,
): OptimisticState<T> {
  switch (action.type) {
    case 'START_OPTIMISTIC':
      return { optimisticValue: action.value, isOptimistic: true };
    case 'RESET_OPTIMISTIC':
      return { ...state, isOptimistic: false };
    case 'ROLLBACK_OPTIMISTIC':
      return { optimisticValue: action.initialValue, isOptimistic: false };
    default:
      return state;
  }
}

/**
 * Hook for managing optimistic updates with automatic rollback
 */
export function useOptimisticUpdate<T>(
  initialValue: T,
  mutation: UseMutationResult<unknown, unknown, unknown>,
) {
  const [state, dispatch] = useReducer(optimisticReducer<T>, {
    optimisticValue: initialValue,
    isOptimistic: false,
  });

  const startOptimisticUpdate = useCallback((newValue: T) => {
    dispatch({ type: 'START_OPTIMISTIC', value: newValue });
  }, []);

  useEffect(() => {
    if (mutation.isSuccess || mutation.isError) {
      if (mutation.isError) {
        // Rollback on error
        dispatch({ type: 'ROLLBACK_OPTIMISTIC', initialValue });
      } else {
        // Just reset on success
        dispatch({ type: 'RESET_OPTIMISTIC' });
      }
    }
  }, [mutation.isSuccess, mutation.isError, initialValue]);

  return {
    value: state.isOptimistic ? state.optimisticValue : initialValue,
    isOptimistic: state.isOptimistic,
    startOptimisticUpdate,
    isMutating: mutation.isPending,
  };
}

/**
 * Utility to check if a query result represents "empty" data
 */
export function isEmpty(data: unknown): boolean {
  if (!data)
    return true;

  // Check API response structure
  const response = data as { success?: boolean; data?: unknown };
  if (response.success === false)
    return true;
  if (!response.data)
    return true;

  // Check array data
  if (Array.isArray(response.data)) {
    return response.data.length === 0;
  }

  // Check object data
  if (typeof response.data === 'object' && response.data !== null) {
    return Object.keys(response.data).length === 0;
  }

  return false;
}

/**
 * Hook for enhanced mutation UI state management
 * Provides comprehensive state for mutation-driven UI
 */
export function useMutationUIState<TData, TError, TVariables>(
  mutation: UseMutationResult<TData, TError, TVariables>,
) {
  const errorInfo = useMutationError(mutation);

  return {
    ...errorInfo,
    isPending: mutation.isPending,
    isIdle: mutation.isIdle,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    data: mutation.data,
    variables: mutation.variables,
    submittedAt: mutation.submittedAt,
    // UI state helpers
    showPending: mutation.isPending,
    showSuccess: mutation.isSuccess && !mutation.isPending,
    showError: mutation.isError && !mutation.isPending,
    canSubmit: !mutation.isPending,
    canReset: mutation.isError || mutation.isSuccess,
  };
}

/**
 * Hook for managing multiple related queries
 * Useful for pages that need multiple data sources
 */
export function useMultipleQueries(queries: UseQueryResult[]) {
  const isLoading = queries.some(q => q.isLoading);
  const isInitialLoading = queries.some(q => q.isLoading && !q.data);
  const isFetching = queries.some(q => q.isFetching);
  const hasError = queries.some(q => q.isError);
  const allSuccess = queries.every(q => !q.isLoading && !q.isError);
  const isAllEmpty = queries.every(q => isEmpty(q.data));

  const errors = queries
    .filter(q => q.error)
    .map(q => extractErrorInfo(q.error));

  return {
    isLoading,
    isInitialLoading,
    isFetching,
    hasError,
    allSuccess,
    isEmpty: isAllEmpty,
    errors,
    // UI states
    showSkeleton: isInitialLoading,
    showSpinner: isFetching && !isLoading,
    showError: hasError && !isLoading,
    showEmpty: allSuccess && isAllEmpty,
    showContent: allSuccess && !isAllEmpty,
    // Actions
    refetchAll: () => queries.forEach(q => q.refetch()),
    canRetryAll: queries.every(q => !q.error || q.failureCount < 3),
  };
}

/**
 * Hook for managing query focus refetching
 * Follows TanStack Query patterns for background updates
 */
export function useQueryFocusRefetch(queries: UseQueryResult[], enabled = true) {
  useEffect(() => {
    if (!enabled)
      return;

    const handleFocus = () => {
      queries.forEach((query) => {
        if (query.isStale || query.isError) {
          query.refetch();
        }
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queries, enabled]);
}

/**
 * Hook for managing query network state
 * Automatically refetches when coming back online
 */
export function useQueryNetworkRefetch(queries: UseQueryResult[], enabled = true) {
  useEffect(() => {
    if (!enabled)
      return;

    const handleOnline = () => {
      queries.forEach((query) => {
        if (query.isError || query.isStale) {
          query.refetch();
        }
      });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queries, enabled]);
}

/**
 * Hook for managing optimistic list updates
 * Specialized for common list mutation patterns
 */
export function useOptimisticList<T extends { id: string | number }>(
  items: T[],
  mutation: UseMutationResult<unknown, unknown, unknown>,
) {
  const optimisticUpdate = useOptimisticUpdate(items, mutation);

  const addItem = useCallback((item: T) => {
    optimisticUpdate.startOptimisticUpdate([...optimisticUpdate.value, item]);
  }, [optimisticUpdate]);

  const updateItem = useCallback((id: string | number, updates: Partial<T>) => {
    const updatedItems = optimisticUpdate.value.map(item =>
      item.id === id ? { ...item, ...updates } : item,
    );
    optimisticUpdate.startOptimisticUpdate(updatedItems);
  }, [optimisticUpdate]);

  const removeItem = useCallback((id: string | number) => {
    const filteredItems = optimisticUpdate.value.filter(item => item.id !== id);
    optimisticUpdate.startOptimisticUpdate(filteredItems);
  }, [optimisticUpdate]);

  return {
    ...optimisticUpdate,
    addItem,
    updateItem,
    removeItem,
  };
}

/**
 * Utility for creating consistent error boundaries integration
 */
export function createQueryErrorBoundary() {
  return {
    throwOnError: (error: unknown, _query: UseQueryResult) => {
      // Only throw on critical system errors, not user errors
      const errorInfo = extractErrorInfo(error);
      return errorInfo.status === 500 || errorInfo.status === undefined;
    },
  };
}

/**
 * Hook for managing stale-while-revalidate pattern
 * Keeps showing old data while fetching new data in background
 */
export function useStaleWhileRevalidate<T>(
  query: UseQueryResult<T>,
  options: { showStaleIndicator?: boolean } = {},
) {
  const { showStaleIndicator = true } = options;

  return {
    data: query.data,
    isStale: query.isStale,
    isFetching: query.isFetching,
    isRefetching: query.isFetching && !!query.data,
    showStaleWarning: showStaleIndicator && query.isStale && !query.isFetching,
    showUpdating: query.isFetching && !!query.data,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook for implementing optimistic mutations with toast feedback
 * Combines optimistic updates with user feedback
 */
export function useOptimisticMutationWithFeedback<TData, TError, TVariables>(
  mutation: UseMutationResult<TData, TError, TVariables>,
  options: {
    successMessage?: string;
    errorMessage?: string;
    loadingMessage?: string;
    showToast?: (type: 'success' | 'error' | 'loading', message: string) => void;
  } = {},
) {
  const { successMessage, errorMessage, loadingMessage, showToast } = options;

  useEffect(() => {
    if (mutation.isPending && loadingMessage && showToast) {
      showToast('loading', loadingMessage);
    }
  }, [mutation.isPending, loadingMessage, showToast]);

  useEffect(() => {
    if (mutation.isSuccess && successMessage && showToast) {
      showToast('success', successMessage);
    }
  }, [mutation.isSuccess, successMessage, showToast]);

  useEffect(() => {
    if (mutation.isError && errorMessage && showToast) {
      const errorInfo = extractErrorInfo(mutation.error);
      showToast('error', errorMessage || errorInfo.message);
    }
  }, [mutation.isError, errorMessage, mutation.error, showToast]);

  return {
    ...mutation,
    isOptimistic: mutation.isPending && !!mutation.variables,
    optimisticData: mutation.variables,
  };
}

/**
 * Hook for coordinated data fetching across multiple related queries
 * Ensures related data is fetched together and stays consistent
 */
export function useCoordinatedQueries<T extends Record<string, UseQueryResult>>(
  queries: T,
  options: {
    refetchTogether?: boolean;
    invalidateTogether?: boolean;
  } = {},
) {
  const { refetchTogether = true } = options;
  const queryList = Object.values(queries);

  const coordinatedRefetch = useCallback(() => {
    if (refetchTogether) {
      return Promise.all(queryList.map(query => query.refetch()));
    }
    return Promise.resolve([]);
  }, [queryList, refetchTogether]);

  const allLoading = queryList.some(q => q.isLoading);
  const allSuccess = queryList.every(q => !q.isLoading && !q.isError);
  const anyError = queryList.some(q => q.isError);
  const allStale = queryList.every(q => q.isStale);

  return {
    queries,
    // Coordinated states
    isLoading: allLoading,
    isSuccess: allSuccess,
    hasError: anyError,
    allStale,
    // Coordinated actions
    refetchAll: coordinatedRefetch,
    // Individual query access
    ...queries,
  };
}

/**
 * Hook for standardized loading and error UI patterns
 * Following TanStack Query best practices for UI state management
 */
export function useQueryUIState(query: UseQueryResult) {
  const loadingState = extractLoadingState(query);
  const errorState = useQueryError(query);

  return {
    ...loadingState,
    ...errorState,
    isEmpty: isEmpty(query.data),
    showSkeleton: loadingState.isInitialLoading,
    showSpinner: loadingState.isRefetching,
    showError: errorState.hasError && !loadingState.isLoading,
    showEmpty: !loadingState.isLoading && !errorState.hasError && isEmpty(query.data),
    showContent: !loadingState.isLoading && !errorState.hasError && !isEmpty(query.data),
    // Additional UI states for better UX
    showRetry: errorState.hasError && errorState.canRetry,
    showBackgroundUpdate: loadingState.isRefetching && !loadingState.isLoading,
    isStale: query.isStale,
    dataUpdatedAt: query.dataUpdatedAt,
    errorUpdatedAt: query.errorUpdatedAt,
    // Accessibility helpers
    ariaLive: loadingState.isFetching ? 'polite' as const : 'off' as const,
    ariaLabel: loadingState.isLoading
      ? 'Loading data'
      : errorState.hasError
        ? `Error: ${errorState.error?.message}`
        : 'Data loaded',
  };
}
