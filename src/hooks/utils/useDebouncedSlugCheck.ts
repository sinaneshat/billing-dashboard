import { useEffect, useReducer } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { authClient } from '@/lib/auth/client';

export type SlugCheckOptions = {
  delay?: number;
  minLength?: number;
  enabled?: boolean;
};

export type SlugCheckResult = {
  isChecking: boolean;
  isValid: boolean;
  isInvalid: boolean;
  error: string | null;
  showFeedback: boolean;
};

// Reducer state and actions for cleaner state management
type SlugCheckState = {
  isChecking: boolean;
  isValid: boolean;
  error: string | null;
  hasChecked: boolean;
};

type SlugCheckAction =
  | { type: 'RESET'; payload: { shouldResetChecked: boolean } }
  | { type: 'START_CHECK' }
  | { type: 'CHECK_SUCCESS' }
  | { type: 'CHECK_ERROR'; payload: string }
  | { type: 'CHECK_FAILED' }
  | { type: 'STOP_CHECK' };

function slugCheckReducer(state: SlugCheckState, action: SlugCheckAction): SlugCheckState {
  switch (action.type) {
    case 'RESET':
      return {
        ...state,
        isValid: false,
        error: null,
        hasChecked: action.payload.shouldResetChecked ? false : state.hasChecked,
      };
    case 'START_CHECK':
      return {
        ...state,
        isChecking: true,
        error: null,
      };
    case 'CHECK_SUCCESS':
      return {
        ...state,
        isChecking: false,
        isValid: true,
        error: null,
        hasChecked: true,
      };
    case 'CHECK_ERROR':
      return {
        ...state,
        isChecking: false,
        isValid: false,
        error: action.payload,
        hasChecked: true,
      };
    case 'CHECK_FAILED':
      return {
        ...state,
        isChecking: false,
        isValid: false,
        error: null,
        hasChecked: true,
      };
    case 'STOP_CHECK':
      return {
        ...state,
        isChecking: false,
      };
    default:
      return state;
  }
}

/**
 * Hook to check slug availability with debouncing
 * Integrates with Better Auth's checkSlug API
 */
export function useDebouncedSlugCheck(
  slug: string,
  options: SlugCheckOptions = {},
): SlugCheckResult {
  const { delay = 500, minLength = 3, enabled = true } = options;

  const [state, dispatch] = useReducer(slugCheckReducer, {
    isChecking: false,
    isValid: false,
    error: null,
    hasChecked: false,
  });

  // Reset states when slug changes - using dispatch instead of direct state updates
  useEffect(() => {
    dispatch({
      type: 'RESET',
      payload: { shouldResetChecked: slug.length < minLength },
    });
  }, [slug, minLength]);

  // Debounced check function - using dispatch for all state updates
  const checkSlugAvailability = useDebouncedCallback(
    async (slugToCheck: string) => {
      if (!enabled || slugToCheck.length < minLength) {
        dispatch({ type: 'STOP_CHECK' });
        return;
      }

      dispatch({ type: 'START_CHECK' });

      try {
        const result = await authClient.organization.checkSlug({
          slug: slugToCheck,
        });

        // Better Auth returns { data: boolean } for availability
        const isAvailable = result?.data ?? false;

        if (isAvailable) {
          dispatch({ type: 'CHECK_SUCCESS' });
        } else {
          dispatch({ type: 'CHECK_ERROR', payload: 'This slug is already taken' });
        }
      } catch (err) {
        // On error, don't show invalid state - just hide feedback
        dispatch({ type: 'CHECK_FAILED' });
        console.warn('Slug check failed:', err);
      }
    },
    delay,
  );

  // Trigger check when slug changes - avoiding direct state updates in useEffect
  useEffect(() => {
    if (enabled && slug && slug.length >= minLength) {
      checkSlugAvailability(slug);
    } else {
      dispatch({ type: 'STOP_CHECK' });
    }
  }, [slug, enabled, minLength, checkSlugAvailability]);

  return {
    isChecking: state.isChecking,
    isValid: state.isValid,
    isInvalid: state.hasChecked && !state.isChecking && !state.isValid && slug.length >= minLength,
    error: state.error,
    showFeedback: state.hasChecked && slug.length >= minLength,
  };
}
