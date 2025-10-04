/**
 * Chat Messages Service - Message Operations API
 *
 * 100% type-safe RPC service for chat message operations
 * All types automatically inferred from backend Hono routes
 */

import type { InferRequestType, InferResponseType } from 'hono/client';
import { parseResponse } from 'hono/client';

import type { ApiClientType } from '@/api/client';
import { createApiClient } from '@/api/client';

// ============================================================================
// Type Inference - Automatically derived from backend routes
// ============================================================================

export type SendMessageRequest = InferRequestType<
  ApiClientType['chat']['threads'][':id']['messages']['$post']
>;

export type SendMessageResponse = InferResponseType<
  ApiClientType['chat']['threads'][':id']['messages']['$post']
>;

export type StreamChatRequest = InferRequestType<
  ApiClientType['chat']['threads'][':id']['stream']['$post']
>;

export type StreamChatResponse = InferResponseType<
  ApiClientType['chat']['threads'][':id']['stream']['$post']
>;

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Send a message to a thread
 * Protected endpoint - requires authentication
 *
 * This endpoint orchestrates multi-model responses:
 * 1. Saves user message to database
 * 2. Generates AI responses from all enabled participants
 * 3. Saves assistant messages to database
 * 4. Returns both user and assistant messages
 *
 * @param threadId - Thread ID
 * @param data - Message content
 */
export async function sendMessageService(
  threadId: string,
  data: Omit<SendMessageRequest, 'param'>,
) {
  const client = await createApiClient();
  return parseResponse(
    client.chat.threads[':id'].messages.$post({
      param: { id: threadId },
      ...data,
    }),
  );
}

/**
 * Stream AI chat response using SSE
 * Protected endpoint - requires authentication
 *
 * This endpoint returns a streaming response for real-time AI chat:
 * 1. Saves user message immediately
 * 2. Streams AI response token-by-token using AI SDK v5
 * 3. Saves assistant message on completion
 * 4. Returns SSE stream (compatible with useChat hook)
 *
 * NOTE: This returns a Response object with SSE stream, not JSON
 *
 * @param threadId - Thread ID
 * @param data - Message content for streaming
 */
export async function streamChatService(
  threadId: string,
  data: Omit<StreamChatRequest, 'param'>,
) {
  const client = await createApiClient();
  // Return the raw Response for streaming (don't parse as JSON)
  return client.chat.threads[':id'].stream.$post({
    param: { id: threadId },
    ...data,
  });
}
