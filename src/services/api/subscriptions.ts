/**
 * Subscriptions Service - 100% RPC Type Inference
 *
 * This service uses Hono's InferRequestType and InferResponseType
 * for complete type safety without any hardcoded types.
 */

import type { InferRequestType, InferResponseType } from 'hono/client';
import { parseResponse } from 'hono/client';

import { apiClient } from '@/api/client';

// ============================================================================
//  Inferred Types for Components
// ============================================================================

// Get Subscriptions
export type GetSubscriptionsRequest = InferRequestType<typeof apiClient.subscriptions.$get>;
export type GetSubscriptionsResponse = InferResponseType<typeof apiClient.subscriptions.$get>;

// Get Single Subscription
export type GetSubscriptionRequest = InferRequestType<(typeof apiClient.subscriptions)[':id']['$get']>;
export type GetSubscriptionResponse = InferResponseType<(typeof apiClient.subscriptions)[':id']['$get']>;

// Create Subscription
export type CreateSubscriptionRequest = InferRequestType<typeof apiClient.subscriptions.$post>;
export type CreateSubscriptionResponse = InferResponseType<typeof apiClient.subscriptions.$post>;

// Cancel Subscription
export type CancelSubscriptionRequest = InferRequestType<(typeof apiClient.subscriptions)[':id']['cancel']['$patch']>;
export type CancelSubscriptionResponse = InferResponseType<(typeof apiClient.subscriptions)[':id']['cancel']['$patch']>;

// ============================================================================
//  Service Functions
// ============================================================================

/**
 * Get all user subscriptions - Context7 consistent pattern
 * All types are inferred from the RPC client
 * CRITICAL FIX: Consistent argument handling for SSR/hydration
 */
export async function getSubscriptionsService(args?: GetSubscriptionsRequest) {
  // Fix: Only pass args if defined to ensure consistent behavior between server/client
  return args
    ? parseResponse(apiClient.subscriptions.$get(args))
    : parseResponse(apiClient.subscriptions.$get());
}

/**
 * Get a single subscription by ID
 * All types are inferred from the RPC client
 */
export async function getSubscriptionService(subscriptionId: string) {
  return parseResponse(apiClient.subscriptions[':id'].$get({
    param: { id: subscriptionId },
  }));
}

/**
 * Create a new subscription
 * All types are inferred from the RPC client
 */
export async function createSubscriptionService(args: CreateSubscriptionRequest) {
  return parseResponse(apiClient.subscriptions.$post(args));
}

/**
 * Cancel an active subscription
 * All types are inferred from the RPC client
 */
export async function cancelSubscriptionService(subscriptionId: string, reason?: string) {
  return parseResponse(apiClient.subscriptions[':id'].cancel.$patch({
    param: { id: subscriptionId },
    json: { reason },
  }));
}
