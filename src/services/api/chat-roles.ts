/**
 * Chat Custom Roles Service - Custom Role Management API
 *
 * 100% type-safe RPC service for custom role template operations
 * All types automatically inferred from backend Hono routes
 */

import type { InferRequestType, InferResponseType } from 'hono/client';
import { parseResponse } from 'hono/client';

import type { ApiClientType } from '@/api/client';
import { createApiClient } from '@/api/client';

// ============================================================================
// Type Inference - Automatically derived from backend routes
// ============================================================================

export type ListCustomRolesRequest = InferRequestType<
  ApiClientType['chat']['custom-roles']['$get']
>;

export type ListCustomRolesResponse = InferResponseType<
  ApiClientType['chat']['custom-roles']['$get']
>;

export type CreateCustomRoleRequest = InferRequestType<
  ApiClientType['chat']['custom-roles']['$post']
>;

export type CreateCustomRoleResponse = InferResponseType<
  ApiClientType['chat']['custom-roles']['$post']
>;

export type GetCustomRoleRequest = InferRequestType<
  ApiClientType['chat']['custom-roles'][':id']['$get']
>;

export type GetCustomRoleResponse = InferResponseType<
  ApiClientType['chat']['custom-roles'][':id']['$get']
>;

export type UpdateCustomRoleRequest = InferRequestType<
  ApiClientType['chat']['custom-roles'][':id']['$patch']
>;

export type UpdateCustomRoleResponse = InferResponseType<
  ApiClientType['chat']['custom-roles'][':id']['$patch']
>;

export type DeleteCustomRoleRequest = InferRequestType<
  ApiClientType['chat']['custom-roles'][':id']['$delete']
>;

export type DeleteCustomRoleResponse = InferResponseType<
  ApiClientType['chat']['custom-roles'][':id']['$delete']
>;

// ============================================================================
// Service Functions
// ============================================================================

/**
 * List user custom role templates with cursor pagination
 * Protected endpoint - requires authentication
 *
 * CRITICAL: Consistent argument handling for SSR/hydration
 * Only pass args if defined to ensure server/client consistency
 */
export async function listCustomRolesService(args?: ListCustomRolesRequest) {
  const client = await createApiClient();
  return parseResponse(client.chat['custom-roles'].$get(args || { query: {} }));
}

/**
 * Create a new custom role template
 * Protected endpoint - requires authentication
 *
 * @param data - Custom role data including name, description, systemPrompt, and defaultSettings
 */
export async function createCustomRoleService(data: CreateCustomRoleRequest) {
  const client = await createApiClient();
  return parseResponse(client.chat['custom-roles'].$post(data));
}

/**
 * Get a specific custom role by ID
 * Protected endpoint - requires authentication
 *
 * @param roleId - Custom role ID
 */
export async function getCustomRoleService(roleId: string) {
  const client = await createApiClient();
  return parseResponse(
    client.chat['custom-roles'][':id'].$get({
      param: { id: roleId },
    }),
  );
}

/**
 * Update custom role details
 * Protected endpoint - requires authentication
 *
 * @param roleId - Custom role ID
 * @param data - Custom role update data
 */
export async function updateCustomRoleService(
  roleId: string,
  data: Omit<UpdateCustomRoleRequest, 'param'>,
) {
  const client = await createApiClient();
  return parseResponse(
    client.chat['custom-roles'][':id'].$patch({
      param: { id: roleId },
      ...data,
    }),
  );
}

/**
 * Delete a custom role template
 * Protected endpoint - requires authentication
 *
 * @param roleId - Custom role ID
 */
export async function deleteCustomRoleService(roleId: string) {
  const client = await createApiClient();
  return parseResponse(
    client.chat['custom-roles'][':id'].$delete({
      param: { id: roleId },
    }),
  );
}
