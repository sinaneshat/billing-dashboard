/**
 * Subscriptions Service - Stripe Subscriptions API
 *
 * 100% type-safe RPC service for Stripe subscription operations
 * All types automatically inferred from backend Hono routes
 */

import type { InferRequestType, InferResponseType } from 'hono/client';
import { parseResponse } from 'hono/client';

import type { ApiClientType } from '@/api/client';
import { createApiClient } from '@/api/client';

// ============================================================================
// Type Inference - Automatically derived from backend routes
// ============================================================================

export type GetSubscriptionsRequest = InferRequestType<
  ApiClientType['subscriptions']['$get']
>;

export type GetSubscriptionsResponse = InferResponseType<
  ApiClientType['subscriptions']['$get']
>;

export type GetSubscriptionRequest = InferRequestType<
  ApiClientType['subscriptions'][':id']['$get']
>;

export type GetSubscriptionResponse = InferResponseType<
  ApiClientType['subscriptions'][':id']['$get']
>;

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get all subscriptions for authenticated user
 * Protected endpoint - requires authentication
 *
 * CRITICAL: Consistent argument handling for SSR/hydration
 * Only pass args if defined to ensure server/client consistency
 */
export async function getSubscriptionsService(args?: GetSubscriptionsRequest) {
  const client = await createApiClient();
  return args
    ? parseResponse(client.subscriptions.$get(args))
    : parseResponse(client.subscriptions.$get());
}

/**
 * Get a specific subscription by ID
 * Protected endpoint - requires authentication and ownership
 *
 * @param subscriptionId - Stripe subscription ID
 */
export async function getSubscriptionService(subscriptionId: string) {
  const client = await createApiClient();
  return parseResponse(
    client.subscriptions[':id'].$get({
      param: { id: subscriptionId },
    }),
  );
}
