/**
 * Subscription Management Service - In-App Subscription Changes
 *
 * 100% type-safe RPC service for subscription switching and cancellation
 * Following Theo's "Stay Sane with Stripe" pattern - handle everything in-app
 * All types automatically inferred from backend Hono routes
 */

import type { InferRequestType, InferResponseType } from 'hono/client';
import { parseResponse } from 'hono/client';

import type { ApiClientType } from '@/api/client';
import { createApiClient } from '@/api/client';

// ============================================================================
// Type Inference - Automatically derived from backend routes
// ============================================================================

export type SwitchSubscriptionRequest = InferRequestType<
  ApiClientType['billing']['subscriptions'][':id']['switch']['$post']
>;

export type SwitchSubscriptionResponse = InferResponseType<
  ApiClientType['billing']['subscriptions'][':id']['switch']['$post']
>;

export type CancelSubscriptionRequest = InferRequestType<
  ApiClientType['billing']['subscriptions'][':id']['cancel']['$post']
>;

export type CancelSubscriptionResponse = InferResponseType<
  ApiClientType['billing']['subscriptions'][':id']['cancel']['$post']
>;

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Switch subscription to a different price plan
 * Protected endpoint - requires authentication
 *
 * Automatically handles:
 * - Upgrades (new > current): Applied immediately with proration
 * - Downgrades (new < current): Applied at period end without proration
 * - Equal prices: Throws validation error
 * - Syncs fresh data from Stripe API
 *
 * @param data - Subscription ID and new price ID
 */
export async function switchSubscriptionService(data: SwitchSubscriptionRequest) {
  const client = await createApiClient();
  return parseResponse(
    client.billing.subscriptions[':id'].switch.$post(data),
  );
}

/**
 * Cancel subscription
 * Protected endpoint - requires authentication
 *
 * - Default: Cancel at period end (user retains access)
 * - Optional: Cancel immediately (user loses access now)
 *
 * @param data - Subscription ID and cancellation settings
 */
export async function cancelSubscriptionService(data: CancelSubscriptionRequest) {
  const client = await createApiClient();
  return parseResponse(
    client.billing.subscriptions[':id'].cancel.$post(data),
  );
}
