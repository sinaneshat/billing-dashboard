/**
 * Health Service - Clean Pass-Through Layer
 *
 * This service acts as a thin wrapper over the API client, providing:
 * - Type-safe function signatures using centralized types from @/api/client
 * - Consistent error handling via handleApiResponse
 * - No business logic or data transformation
 * - Clean function names for better developer experience
 */

import type { InferRequestType, InferResponseType } from 'hono/client';

import { apiClient } from '@/api/client';

// ============================================================================
// Exported Types for Health Service Functions
// ============================================================================

export type CheckHealthRequest = InferRequestType<typeof apiClient.system.health.$get>;
export type CheckHealthResponse = InferResponseType<typeof apiClient.system.health.$get>;

export type CheckDetailedHealthRequest = InferRequestType<typeof apiClient.system.health.detailed.$get>;
export type CheckDetailedHealthResponse = InferResponseType<typeof apiClient.system.health.detailed.$get>;

// ============================================================================
// Health Service Functions
// ============================================================================

/**
 * Check basic system health status
 *
 * @returns Promise<CheckHealthResponse> - Basic health status
 */
export async function checkHealth() {
  return apiClient.system.health.$get();
}

/**
 * Check detailed system health status with dependency information
 *
 * @returns Promise<CheckDetailedHealthResponse> - Detailed health status
 */
export async function checkDetailedHealth() {
  return apiClient.system.health.detailed.$get();
}
