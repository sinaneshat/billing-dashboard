/**
 * Health Service - 100% RPC Type Inference
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
export type CheckHealthRequest = InferRequestType<typeof apiClient.health['$get']>;
export type CheckHealthResponse = InferResponseType<typeof apiClient.health['$get']>;

export type CheckDetailedHealthRequest = InferRequestType<typeof apiClient.health.detailed['$get']>;
export type CheckDetailedHealthResponse = InferResponseType<typeof apiClient.health.detailed['$get']>;

/**
 * Check basic system health status
 * All types are inferred from the RPC client
 */
export async function checkHealthService(args?: CheckHealthRequest) {
  return parseResponse(apiClient.health.$get(args));
}

/**
 * Check detailed system health status
 * All types are inferred from the RPC client
 */
export async function checkDetailedHealthService(args?: CheckDetailedHealthRequest) {
  return parseResponse(apiClient.health.detailed.$get(args));
}
