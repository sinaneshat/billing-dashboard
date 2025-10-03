/**
 * Customer Portal Service - Stripe Customer Portal API
 *
 * 100% type-safe RPC service for Stripe customer portal operations
 * All types automatically inferred from backend Hono routes
 */

import type { InferRequestType, InferResponseType } from 'hono/client';
import { parseResponse } from 'hono/client';

import type { ApiClientType } from '@/api/client';
import { createApiClient } from '@/api/client';

// ============================================================================
// Type Inference - Automatically derived from backend routes
// ============================================================================

export type CreateCustomerPortalSessionRequest = InferRequestType<
  ApiClientType['billing']['portal']['$post']
>;

export type CreateCustomerPortalSessionResponse = InferResponseType<
  ApiClientType['billing']['portal']['$post']
>;

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Create Stripe customer portal session for subscription management
 * Protected endpoint - requires authentication and existing Stripe customer
 *
 * @param data - Optional returnUrl for after portal session
 */
export async function createCustomerPortalSessionService(data?: CreateCustomerPortalSessionRequest) {
  const client = await createApiClient();
  return parseResponse(client.billing.portal.$post(data || { json: {} }));
}
