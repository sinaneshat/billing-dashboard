import type { UIMessage } from 'ai';

/**
 * AI SDK v5 Streaming Utilities
 *
 * Helper functions for working with AI SDK v5 UIMessage format.
 * For actual streaming, use the OpenRouter service singleton:
 * @see openRouterService.streamUIMessages()
 */

/**
 * Build UI Messages from Database Messages
 *
 * Converts database chat messages to AI SDK v5 UIMessage format.
 * This helper ensures consistent message formatting for the AI SDK.
 *
 * @param messages - Array of messages with role and content
 * @returns Array of UIMessage objects with parts
 *
 * @example
 * ```typescript
 * const dbMessages = await db.query.chatMessage.findMany({
 *   where: eq(chatMessage.threadId, threadId),
 *   orderBy: asc(chatMessage.createdAt),
 * });
 *
 * const uiMessages = buildUIMessages(dbMessages);
 * ```
 */
export function buildUIMessages(
  messages: Array<{ id?: string; role: 'user' | 'assistant'; content: string }>,
): UIMessage[] {
  return messages.map((msg, index) => ({
    id: msg.id || `msg-${index}`,
    role: msg.role,
    parts: [
      {
        type: 'text' as const,
        text: msg.content,
      },
    ],
  }));
}
