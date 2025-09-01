/**
 * TanStack Query Helper Utilities
 *
 * Provides utility functions and hooks for better error handling,
 * loading states, and common query patterns.
 */

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useReducer } from 'react';

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
    const err = error as Record<string, unknown>;

    // Hono RPC error format
    if (typeof err.message === 'string') {
      return {
        message: err.message,
        status: typeof err.status === 'number' ? err.status : undefined,
        code: typeof err.code === 'string' ? err.code : undefined,
        details: err.details || err.data,
      };
    }

    // Fetch error
    if (typeof err.status === 'number' && typeof err.statusText === 'string') {
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
 * Helper for standardized loading and error UI patterns
 */
/**
 * Hook for standardized loading and error UI patterns
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
  };
}
