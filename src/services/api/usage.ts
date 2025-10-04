/**
 * Usage Service - Chat Usage and Quota API
 *
 * 100% type-safe RPC service for usage tracking operations
 * All types automatically inferred from backend Hono routes
 */

import type { InferRequestType, InferResponseType } from 'hono/client';
import { parseResponse } from 'hono/client';

import type { ApiClientType } from '@/api/client';
import { createApiClient } from '@/api/client';

// ============================================================================
// Type Inference - Automatically derived from backend routes
// ============================================================================

export type GetUsageStatsRequest = InferRequestType<
  ApiClientType['usage']['stats']['$get']
>;

export type GetUsageStatsResponse = InferResponseType<
  ApiClientType['usage']['stats']['$get']
>;

export type CheckThreadQuotaRequest = InferRequestType<
  ApiClientType['usage']['quota']['threads']['$get']
>;

export type CheckThreadQuotaResponse = InferResponseType<
  ApiClientType['usage']['quota']['threads']['$get']
>;

export type CheckMessageQuotaRequest = InferRequestType<
  ApiClientType['usage']['quota']['messages']['$get']
>;

export type CheckMessageQuotaResponse = InferResponseType<
  ApiClientType['usage']['quota']['messages']['$get']
>;

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get comprehensive usage statistics for the authenticated user
 * Returns threads, messages, and subscription tier information
 * Protected endpoint - requires authentication
 */
export async function getUserUsageStatsService(args?: GetUsageStatsRequest) {
  const client = await createApiClient();
  return args
    ? parseResponse(client.usage.stats.$get(args))
    : parseResponse(client.usage.stats.$get());
}

/**
 * Check thread creation quota
 * Returns whether the user can create more threads
 * Protected endpoint - requires authentication
 */
export async function checkThreadQuotaService(args?: CheckThreadQuotaRequest) {
  const client = await createApiClient();
  return args
    ? parseResponse(client.usage.quota.threads.$get(args))
    : parseResponse(client.usage.quota.threads.$get());
}

/**
 * Check message creation quota
 * Returns whether the user can send more messages
 * Protected endpoint - requires authentication
 */
export async function checkMessageQuotaService(args?: CheckMessageQuotaRequest) {
  const client = await createApiClient();
  return args
    ? parseResponse(client.usage.quota.messages.$get(args))
    : parseResponse(client.usage.quota.messages.$get());
}
