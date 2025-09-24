/**
 * Subscriptions Service - 100% RPC Type Inference
 *
 * This service uses Hono's InferRequestType and InferResponseType
 * for complete type safety without any hardcoded types.
 */

import type { InferRequestType, InferResponseType } from 'hono/client';
import { parseResponse } from 'hono/client';

import type { ApiClientType } from '@/api/client';
import { createApiClient } from '@/api/client';

// ============================================================================
//  Inferred Types for Components
// ============================================================================

// These types are 100% inferred from the RPC client
// Using centralized ApiClientType from @/api/client

// Get Subscriptions
export type GetSubscriptionsRequest = InferRequestType<ApiClientType['subscriptions']['$get']>;
export type GetSubscriptionsResponse = InferResponseType<ApiClientType['subscriptions']['$get']>;

// Get Single Subscription
export type GetSubscriptionRequest = InferRequestType<ApiClientType['subscriptions'][':id']['$get']>;
export type GetSubscriptionResponse = InferResponseType<ApiClientType['subscriptions'][':id']['$get']>;

// Create Subscription
export type CreateSubscriptionRequest = InferRequestType<ApiClientType['subscriptions']['$post']>;
export type CreateSubscriptionResponse = InferResponseType<ApiClientType['subscriptions']['$post']>;

// Change Subscription Plan
export type ChangePlanRequest = InferRequestType<ApiClientType['subscriptions'][':id']['$patch']>;
export type ChangePlanResponse = InferResponseType<ApiClientType['subscriptions'][':id']['$patch']>;

// Cancel Subscription
export type CancelSubscriptionRequest = InferRequestType<ApiClientType['subscriptions'][':id']['cancel']['$patch']>;
export type CancelSubscriptionResponse = InferResponseType<ApiClientType['subscriptions'][':id']['cancel']['$patch']>;

// ============================================================================
//  Service Functions
// ============================================================================

/**
 * Get all user subscriptions - Context7 consistent pattern
 * All types are inferred from the RPC client
 * CRITICAL FIX: Consistent argument handling for SSR/hydration
 */
export async function getSubscriptionsService(args?: GetSubscriptionsRequest) {
  const client = await createApiClient();
  // Fix: Only pass args if defined to ensure consistent behavior between server/client
  return args
    ? parseResponse(client.subscriptions.$get(args))
    : parseResponse(client.subscriptions.$get());
}

/**
 * Get a single subscription by ID
 * All types are inferred from the RPC client
 */
export async function getSubscriptionService(subscriptionId: string) {
  const client = await createApiClient();
  return parseResponse(client.subscriptions[':id'].$get({
    param: { id: subscriptionId },
  }));
}

/**
 * Create a new subscription
 * All types are inferred from the RPC client
 */
export async function createSubscriptionService(args: CreateSubscriptionRequest) {
  const client = await createApiClient();
  return parseResponse(client.subscriptions.$post(args));
}

/**
 * Change subscription plan
 * All types are inferred from the RPC client
 */
export async function changePlanService(args: ChangePlanRequest) {
  const client = await createApiClient();
  return parseResponse(client.subscriptions[':id'].$patch(args));
}

/**
 * Cancel an active subscription
 * All types are inferred from the RPC client
 */
export async function cancelSubscriptionService(args: CancelSubscriptionRequest) {
  const client = await createApiClient();
  return parseResponse(client.subscriptions[':id'].cancel.$patch(args));
}
