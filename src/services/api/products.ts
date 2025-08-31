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
 * Get all active products
 * All types are inferred from the RPC client
 */
export async function getProductsService(args?: GetProductsRequest) {
  return parseResponse(apiClient.products.$get(args));
}
