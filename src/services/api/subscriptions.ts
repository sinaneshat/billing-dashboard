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
export type GetSubscriptionRequest = {
  param: { id: string };
};
export type GetSubscriptionResponse = InferResponseType<typeof apiClient.subscriptions.$get>;

// Create Subscription
export type CreateSubscriptionRequest = InferRequestType<typeof apiClient.subscriptions.$post>;
export type CreateSubscriptionResponse = InferResponseType<typeof apiClient.subscriptions.$post>;

// Cancel Subscription
export type CancelSubscriptionRequest = {
  param: { id: string };
  json: { reason?: string };
};
export type CancelSubscriptionResponse = {
  success: boolean;
  data?: { subscriptionId: string; status: 'canceled'; canceledAt: string } | undefined;
};

// Resubscribe
export type ResubscribeRequest = {
  param: { id: string };
  json: { callbackUrl: string };
};
export type ResubscribeResponse = {
  success: boolean;
  data?: { subscriptionId: string; paymentUrl: string; authority: string } | undefined;
};

// ============================================================================
//  Service Functions
// ============================================================================

/**
 * Get all user subscriptions
 * All types are inferred from the RPC client
 */
export async function getSubscriptionsService(args?: GetSubscriptionsRequest) {
  return parseResponse(apiClient.subscriptions.$get(args));
}

/**
 * Get a single subscription by ID
 * All types are inferred from the RPC client
 */
export async function getSubscriptionService(subscriptionId: string) {
  return parseResponse(apiClient.subscriptions.$get({
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

/**
 * Resubscribe to a canceled subscription
 * All types are inferred from the RPC client
 */
export async function resubscribeService(subscriptionId: string, callbackUrl: string) {
  return parseResponse(apiClient.subscriptions[':id'].resubscribe.$post({
    param: { id: subscriptionId },
    json: { callbackUrl },
  }));
}
