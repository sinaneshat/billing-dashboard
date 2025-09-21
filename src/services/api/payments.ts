/**
 * Payment Service - 100% RPC Type Inference
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

// Get Payments
export type GetPaymentsRequest = InferRequestType<(typeof apiClient)['payments']['$get']>;
export type GetPaymentsResponse = InferResponseType<(typeof apiClient)['payments']['$get']>;

// ============================================================================
//  Service Functions
// ============================================================================

/**
 * Get all user payments - Context7 consistent pattern
 * All types are inferred from the RPC client
 * CRITICAL FIX: Consistent argument handling for SSR/hydration
 */
export async function getPaymentsService(args?: GetPaymentsRequest) {
  // Fix: Only pass args if defined to ensure consistent behavior between server/client
  return args
    ? parseResponse(apiClient.payments.$get(args))
    : parseResponse(apiClient.payments.$get());
}
