/**
 * Products Service - Stripe Products API
 *
 * 100% type-safe RPC service for Stripe product operations
 * All types automatically inferred from backend Hono routes
 */

import type { InferRequestType, InferResponseType } from 'hono/client';
import { parseResponse } from 'hono/client';

import type { ApiClientType } from '@/api/client';
import { createApiClient } from '@/api/client';

// ============================================================================
// Type Inference - Automatically derived from backend routes
// ============================================================================

export type GetProductsRequest = InferRequestType<
  ApiClientType['products']['$get']
>;

export type GetProductsResponse = InferResponseType<
  ApiClientType['products']['$get']
>;

export type GetProductRequest = InferRequestType<
  ApiClientType['products'][':id']['$get']
>;

export type GetProductResponse = InferResponseType<
  ApiClientType['products'][':id']['$get']
>;

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get all active products with pricing plans
 * Public endpoint - no authentication required
 *
 * CRITICAL: Consistent argument handling for SSR/hydration
 * Only pass args if defined to ensure server/client consistency
 */
export async function getProductsService(args?: GetProductsRequest) {
  const client = await createApiClient();
  return args
    ? parseResponse(client.products.$get(args))
    : parseResponse(client.products.$get());
}

/**
 * Get a specific product by ID with all pricing plans
 * Public endpoint - no authentication required
 *
 * @param productId - Stripe product ID
 */
export async function getProductService(productId: string) {
  const client = await createApiClient();
  return parseResponse(
    client.products[':id'].$get({
      param: { id: productId },
    }),
  );
}
