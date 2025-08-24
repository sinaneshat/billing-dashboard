/**
 * Auth Service - 100% RPC Type Inference
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
export type GetCurrentUserRequest = InferRequestType<typeof apiClient.auth.me['$get']>;
export type GetCurrentUserResponse = InferResponseType<typeof apiClient.auth.me['$get']>;

/**
 * Get current authenticated user information
 * All types are inferred from the RPC client
 */
export async function getCurrentUserService(args?: GetCurrentUserRequest) {
  return parseResponse(apiClient.auth.me.$get(args));
}
