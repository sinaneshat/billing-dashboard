/**
 * Products Service - 100% RPC Type Inference
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

// These types are 100% inferred from the RPC client
export type GetProductsRequest = InferRequestType<typeof apiClient.products['$get']>;
export type GetProductsResponse = InferResponseType<typeof apiClient.products['$get']>;

/**
 * Get all active products - Context7 consistent pattern
 * All types are inferred from the RPC client
 * CRITICAL FIX: Consistent argument handling for SSR/hydration
 */
export async function getProductsService(args?: GetProductsRequest) {
  // Fix: Only pass args if defined to ensure consistent behavior between server/client
  return args
    ? parseResponse(apiClient.products.$get(args))
    : parseResponse(apiClient.products.$get());
}
