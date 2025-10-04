/**
 * Title Generator Service
 *
 * Auto-generates descriptive titles for chat threads using AI
 * Similar to ChatGPT's automatic title generation
 * Uses the first user message to create a concise, descriptive title
 */

import { eq } from 'drizzle-orm';

import { createError } from '@/api/common/error-handling';
import type { ErrorContext } from '@/api/core';
import { apiLogger } from '@/api/middleware/hono-logger';
import type { ApiEnv } from '@/api/types';
import { getDbAsync } from '@/db';
import * as tables from '@/db/schema';

import { initializeOpenRouter, openRouterService } from './openrouter.service';
import { updateThreadSlug } from './slug-generator.service';

/**
 * System prompt for title generation
 * Instructs the AI to create short, descriptive titles
 */
const TITLE_GENERATION_PROMPT = `You are a helpful assistant that generates concise, descriptive titles for conversations.

Based on the user's first message, generate a short title (3-6 words maximum) that captures the main topic or purpose of the conversation.

Rules:
- Maximum 6 words
- No quotes or special characters
- Capitalize first letter of each major word
- Be specific and descriptive
- Examples:
  * "Product Launch Strategy Discussion"
  * "Python Code Debugging Help"
  * "Travel Planning for Europe"
  * "Marketing Campaign Ideas"
  * "Database Schema Design"

Only respond with the title itself, nothing else.`;

/**
 * Generate title from first user message
 * Uses Claude Sonnet 4.1 for fast, accurate title generation
 */
export async function generateTitleFromMessage(
  firstMessage: string,
  env: ApiEnv['Bindings'],
): Promise<string> {
  try {
    // Initialize OpenRouter with API key
    initializeOpenRouter(env);

    // Use Claude Sonnet 4.1 for title generation (fast and accurate)
    const result = await openRouterService.generateText({
      modelId: 'anthropic/claude-sonnet-4.1',
      messages: [
        {
          role: 'user',
          content: firstMessage,
        },
      ],
      systemPrompt: TITLE_GENERATION_PROMPT,
      temperature: 0.7,
      maxTokens: 50, // Titles should be very short
    });

    // Clean up the generated title
    let title = result.text.trim();

    // Remove quotes if AI added them
    title = title.replace(/^["']|["']$/g, '');

    // Limit to 60 characters max
    if (title.length > 60) {
      title = title.substring(0, 60).trim();
    }

    // If title is empty or too short, use fallback
    if (title.length < 3) {
      title = 'New Chat';
    }

    apiLogger.info('Generated title from message', {
      originalMessage: firstMessage.substring(0, 100),
      generatedTitle: title,
      usage: result.usage,
    });

    return title;
  } catch (error) {
    apiLogger.error('Title generation failed, using fallback', {
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback: Use first few words of message
    const words = firstMessage.split(' ').slice(0, 5).join(' ');
    return words.length > 60 ? words.substring(0, 60) : words || 'New Chat';
  }
}

/**
 * Update thread title and slug
 * Called after generating a title from the first message
 */
export async function updateThreadTitleAndSlug(
  threadId: string,
  newTitle: string,
): Promise<{ title: string; slug: string }> {
  const db = await getDbAsync();

  // Generate new slug from title
  const newSlug = await updateThreadSlug(threadId, newTitle);

  // Update title in database (slug already updated by updateThreadSlug)
  await db
    .update(tables.chatThread)
    .set({
      title: newTitle,
      updatedAt: new Date(),
    })
    .where(eq(tables.chatThread.id, threadId));

  apiLogger.info('Updated thread title and slug', {
    threadId,
    newTitle,
    newSlug,
  });

  return { title: newTitle, slug: newSlug };
}

/**
 * Auto-generate and update thread title from first message
 * Should be called when the first message is sent in a thread
 */
export async function autoGenerateThreadTitle(
  threadId: string,
  firstMessage: string,
  env: ApiEnv['Bindings'],
): Promise<{ title: string; slug: string }> {
  const db = await getDbAsync();

  // Check if thread exists
  const thread = await db.query.chatThread.findFirst({
    where: eq(tables.chatThread.id, threadId),
  });

  if (!thread) {
    const context: ErrorContext = {
      errorType: 'resource',
      resource: 'chat_thread',
      resourceId: threadId,
    };
    throw createError.notFound('Thread not found', context);
  }

  // Only auto-generate if thread still has default "New Chat" title
  if (thread.title !== 'New Chat') {
    apiLogger.info('Thread already has custom title, skipping auto-generation', {
      threadId,
      existingTitle: thread.title,
    });
    return { title: thread.title, slug: thread.slug };
  }

  // Generate title from message
  const generatedTitle = await generateTitleFromMessage(firstMessage, env);

  // Update thread with new title and slug
  return await updateThreadTitleAndSlug(threadId, generatedTitle);
}
