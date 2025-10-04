/**
 * Chat Participants Service - Participant Management API
 *
 * 100% type-safe RPC service for chat participant operations
 * All types automatically inferred from backend Hono routes
 */

import type { InferRequestType, InferResponseType } from 'hono/client';
import { parseResponse } from 'hono/client';

import type { ApiClientType } from '@/api/client';
import { createApiClient } from '@/api/client';

// ============================================================================
// Type Inference - Automatically derived from backend routes
// ============================================================================

export type AddParticipantRequest = InferRequestType<
  ApiClientType['chat']['threads'][':id']['participants']['$post']
>;

export type AddParticipantResponse = InferResponseType<
  ApiClientType['chat']['threads'][':id']['participants']['$post']
>;

export type UpdateParticipantRequest = InferRequestType<
  ApiClientType['chat']['participants'][':id']['$patch']
>;

export type UpdateParticipantResponse = InferResponseType<
  ApiClientType['chat']['participants'][':id']['$patch']
>;

export type DeleteParticipantRequest = InferRequestType<
  ApiClientType['chat']['participants'][':id']['$delete']
>;

export type DeleteParticipantResponse = InferResponseType<
  ApiClientType['chat']['participants'][':id']['$delete']
>;

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Add a participant (AI model) to a thread
 * Protected endpoint - requires authentication
 *
 * @param threadId - Thread ID
 * @param data - Participant data including modelId, role, priority, and settings
 */
export async function addParticipantService(
  threadId: string,
  data: Omit<AddParticipantRequest, 'param'>,
) {
  const client = await createApiClient();
  return parseResponse(
    client.chat.threads[':id'].participants.$post({
      param: { id: threadId },
      ...data,
    }),
  );
}

/**
 * Update participant settings
 * Protected endpoint - requires authentication
 *
 * @param participantId - Participant ID
 * @param data - Participant update data (role, priority, settings, isEnabled)
 */
export async function updateParticipantService(
  participantId: string,
  data: Omit<UpdateParticipantRequest, 'param'>,
) {
  const client = await createApiClient();
  return parseResponse(
    client.chat.participants[':id'].$patch({
      param: { id: participantId },
      ...data,
    }),
  );
}

/**
 * Remove a participant from a thread
 * Protected endpoint - requires authentication
 *
 * @param participantId - Participant ID
 */
export async function deleteParticipantService(participantId: string) {
  const client = await createApiClient();
  return parseResponse(
    client.chat.participants[':id'].$delete({
      param: { id: participantId },
    }),
  );
}
