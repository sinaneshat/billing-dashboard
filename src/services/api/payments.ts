/**
 * Payment Service - 100% RPC Type Inference
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

// Get Payments
export type GetPaymentsRequest = InferRequestType<ApiClientType['payments']['$get']>;
export type GetPaymentsResponse = InferResponseType<ApiClientType['payments']['$get']>;

// ============================================================================
//  Service Functions
// ============================================================================

/**
 * Get all user payments - Context7 consistent pattern
 * All types are inferred from the RPC client
 * CRITICAL FIX: Consistent argument handling for SSR/hydration
 */
export async function getPaymentsService(args?: GetPaymentsRequest) {
  const client = await createApiClient();
  // Fix: Only pass args if defined to ensure consistent behavior between server/client
  return args
    ? parseResponse(client.payments.$get(args))
    : parseResponse(client.payments.$get());
}
