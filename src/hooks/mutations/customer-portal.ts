/**
 * Customer Portal Mutation Hooks
 *
 * TanStack Mutation hooks for Stripe customer portal operations
 * Following patterns from checkout mutations
 */

'use client';

import { useMutation } from '@tanstack/react-query';

import { createCustomerPortalSessionService } from '@/services/api';

/**
 * Hook to create Stripe customer portal session
 * Protected endpoint - requires authentication and existing Stripe customer
 *
 * After successful portal session creation, user is redirected to Stripe portal
 */
export function useCreateCustomerPortalSessionMutation() {
  return useMutation({
    mutationFn: createCustomerPortalSessionService,
    onError: (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to create customer portal session', error);
      }
    },
    retry: (failureCount, error: unknown) => {
      // Don't retry on client errors (4xx)
      const httpError = error as { status?: number };
      if (httpError?.status && httpError.status >= 400 && httpError.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    throwOnError: false,
  });
}
