import type { RouteHandler } from '@hono/zod-openapi';
import { desc, eq } from 'drizzle-orm';
import { ulid } from 'ulid';

import { createError } from '@/api/common/error-handling';
import type { ErrorContext } from '@/api/core';
import { createHandler, Responses } from '@/api/core';
import { apiLogger } from '@/api/middleware/hono-logger';
import type { AIMessage } from '@/api/services/openrouter.service';
import { initializeOpenRouter, openRouterService } from '@/api/services/openrouter.service';
import { generateUniqueSlug } from '@/api/services/slug-generator.service';
import { autoGenerateThreadTitle } from '@/api/services/title-generator.service';
import {
  enforceMessageQuota,
  enforceThreadQuota,
  incrementMessageUsage,
  incrementThreadUsage,
} from '@/api/services/usage-tracking.service';
import type { ApiEnv } from '@/api/types';
import { getDbAsync } from '@/db';
import * as tables from '@/db/schema';

import type {
  addParticipantRoute,
  createMemoryRoute,
  createThreadRoute,
  deleteMemoryRoute,
  deleteParticipantRoute,
  deleteThreadRoute,
  getMemoryRoute,
  getMessageRoute,
  getPublicThreadRoute,
  getThreadRoute,
  listMemoriesRoute,
  listMessagesRoute,
  listParticipantsRoute,
  listThreadsRoute,
  sendMessageRoute,
  updateMemoryRoute,
  updateParticipantRoute,
  updateThreadRoute,
} from './route';
import {
  AddParticipantRequestSchema,
  CreateMemoryRequestSchema,
  CreateThreadRequestSchema,
  MemoryIdParamSchema,
  MessageIdParamSchema,
  ParticipantIdParamSchema,
  SendMessageRequestSchema,
  ThreadIdParamSchema,
  ThreadSlugParamSchema,
  UpdateMemoryRequestSchema,
  UpdateParticipantRequestSchema,
  UpdateThreadRequestSchema,
} from './schema';

// ============================================================================
// Internal Helper Functions
// ============================================================================

function createAuthErrorContext(operation?: string): ErrorContext {
  return {
    errorType: 'authentication',
    operation: operation || 'session_required',
  };
}

function createResourceNotFoundContext(
  resource: string,
  resourceId?: string,
): ErrorContext {
  return {
    errorType: 'resource',
    resource,
    resourceId,
  };
}

function createAuthorizationErrorContext(
  resource: string,
  resourceId?: string,
): ErrorContext {
  return {
    errorType: 'authorization',
    resource,
    resourceId,
  };
}

// ============================================================================
// Thread Handlers
// ============================================================================

export const listThreadsHandler: RouteHandler<typeof listThreadsRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'listThreads',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    // Parse query parameters for cursor pagination
    const query = c.req.query();
    const cursor = query.cursor;
    const limit = query.limit ? Number.parseInt(query.limit, 10) : 20;
    const db = await getDbAsync();

    // Fetch threads with limit + 1 to determine if there's a next page
    const threads = await db.query.chatThread.findMany({
      where: (fields, { eq, and, lt }) => cursor
        ? and(
            eq(fields.userId, user.id),
            lt(fields.id, cursor),
          )
        : eq(fields.userId, user.id),
      orderBy: [desc(tables.chatThread.updatedAt)],
      limit: limit! + 1, // Fetch one extra to check if there's a next page
    });

    // Check if there's a next page
    const hasNextPage = threads.length > limit!;
    const threadsToReturn = hasNextPage ? threads.slice(0, limit) : threads;
    const nextCursor = hasNextPage ? threadsToReturn[threadsToReturn.length - 1]?.id : null;

    return Responses.ok(c, {
      threads: threadsToReturn,
      nextCursor,
    });
  },
);

export const createThreadHandler: RouteHandler<typeof createThreadRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'createThread',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    // Enforce thread and message quotas BEFORE creating anything
    await enforceThreadQuota(user.id);
    await enforceMessageQuota(user.id); // First message will be created

    const body = CreateThreadRequestSchema.parse(await c.req.json());
    const db = await getDbAsync();

    // Default title to "New Chat" (will be auto-generated from first message)
    const title = body.title || 'New Chat';

    // Generate unique slug from title
    const slug = await generateUniqueSlug(title);

    const threadId = ulid();
    const now = new Date();

    // Create thread
    const [thread] = await db
      .insert(tables.chatThread)
      .values({
        id: threadId,
        userId: user.id,
        title,
        slug,
        mode: body.mode || 'brainstorming',
        status: 'active',
        isFavorite: false,
        isPublic: false,
        metadata: body.metadata,
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
      })
      .returning();

    // Create participants with priority based on array order (immutable)
    const participants = await Promise.all(
      body.participants.map(async (p, index) => {
        const participantId = ulid();
        const [participant] = await db
          .insert(tables.chatParticipant)
          .values({
            id: participantId,
            threadId,
            modelId: p.modelId,
            role: p.role,
            priority: index, // Array order determines priority
            isEnabled: true,
            settings: {
              systemPrompt: p.systemPrompt,
              temperature: p.temperature,
              maxTokens: p.maxTokens,
            },
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        return participant;
      }),
    );

    // Create first user message
    const userMessageId = ulid();
    const [userMessage] = await db
      .insert(tables.chatMessage)
      .values({
        id: userMessageId,
        threadId,
        participantId: null,
        role: 'user',
        content: body.firstMessage,
        createdAt: now,
      })
      .returning();

    // Auto-generate thread title from first message in background
    autoGenerateThreadTitle(threadId, body.firstMessage, c.env).catch((error) => {
      apiLogger.error('Failed to auto-generate thread title', {
        threadId,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    // Build conversation context for AI responses
    const conversationMessages: AIMessage[] = [
      {
        role: 'user',
        content: body.firstMessage,
      },
    ];

    // Initialize OpenRouter and orchestrate multi-model responses
    initializeOpenRouter(c.env);
    const orchestrationResults = await openRouterService.orchestrateMultiModel(
      participants.map(p => ({
        participantId: p!.id,
        modelId: p!.modelId,
        role: p!.role,
        priority: p!.priority,
        systemPrompt: p!.settings?.systemPrompt,
        temperature: p!.settings?.temperature,
        maxTokens: p!.settings?.maxTokens,
      })),
      conversationMessages,
      thread!.mode,
    );

    // Save assistant messages
    const assistantMessages = await Promise.all(
      orchestrationResults.map(async (result) => {
        const messageId = ulid();
        const [message] = await db
          .insert(tables.chatMessage)
          .values({
            id: messageId,
            threadId,
            participantId: result.participantId,
            role: 'assistant',
            content: result.text,
            metadata: {
              model: result.modelId,
              finishReason: result.finishReason,
              usage: result.usage,
            },
            createdAt: now,
          })
          .returning();
        return message;
      }),
    );

    // Increment usage counters AFTER successful creation
    await incrementThreadUsage(user.id);
    const totalMessagesCreated = 1 + assistantMessages.length;
    await incrementMessageUsage(user.id, totalMessagesCreated);

    // Return thread with participants and messages
    return Responses.ok(c, {
      thread,
      participants,
      messages: [userMessage, ...assistantMessages],
    });
  },
);

export const getThreadHandler: RouteHandler<typeof getThreadRoute, ApiEnv> = createHandler(
  {
    auth: 'session-optional', // Allow both authenticated and unauthenticated access
    operationName: 'getThread',
  },
  async (c) => {
    const user = c.var.user; // May be undefined for unauthenticated requests

    const { id } = ThreadIdParamSchema.parse(c.req.param());
    const db = await getDbAsync();

    const thread = await db.query.chatThread.findFirst({
      where: eq(tables.chatThread.id, id),
    });

    if (!thread) {
      throw createError.notFound('Thread not found', createResourceNotFoundContext('thread', id));
    }

    // Smart access control: Public threads are accessible to anyone, private threads require ownership
    if (!thread.isPublic) {
      // Private thread - requires authentication and ownership
      if (!user) {
        throw createError.unauthenticated(
          'Authentication required to access private thread',
          createAuthErrorContext(),
        );
      }

      if (thread.userId !== user.id) {
        throw createError.unauthorized(
          'Not authorized to access this thread',
          createAuthorizationErrorContext('thread', id),
        );
      }
    }

    // Fetch participants (ordered by priority)
    const participants = await db.query.chatParticipant.findMany({
      where: eq(tables.chatParticipant.threadId, id),
      orderBy: [tables.chatParticipant.priority],
    });

    // Fetch messages (ordered by creation time)
    const messages = await db.query.chatMessage.findMany({
      where: eq(tables.chatMessage.threadId, id),
      orderBy: [tables.chatMessage.createdAt],
    });

    // Return everything in one response (ChatGPT pattern)
    return Responses.ok(c, {
      thread,
      participants,
      messages,
    });
  },
);

export const updateThreadHandler: RouteHandler<typeof updateThreadRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'updateThread',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    const { id } = ThreadIdParamSchema.parse(c.req.param());
    const body = UpdateThreadRequestSchema.parse(await c.req.json());
    const db = await getDbAsync();

    const existingThread = await db.query.chatThread.findFirst({
      where: eq(tables.chatThread.id, id),
    });

    if (!existingThread) {
      throw createError.notFound('Thread not found', createResourceNotFoundContext('thread', id));
    }

    if (existingThread.userId !== user.id) {
      throw createError.unauthorized('Not authorized to update this thread', createAuthorizationErrorContext('thread', id));
    }

    const [updatedThread] = await db
      .update(tables.chatThread)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(tables.chatThread.id, id))
      .returning();

    return Responses.ok(c, {
      thread: updatedThread,
    });
  },
);

export const deleteThreadHandler: RouteHandler<typeof deleteThreadRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'deleteThread',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    const { id } = ThreadIdParamSchema.parse(c.req.param());
    const db = await getDbAsync();

    const existingThread = await db.query.chatThread.findFirst({
      where: eq(tables.chatThread.id, id),
    });

    if (!existingThread) {
      throw createError.notFound('Thread not found', createResourceNotFoundContext('thread', id));
    }

    if (existingThread.userId !== user.id) {
      throw createError.unauthorized('Not authorized to delete this thread', createAuthorizationErrorContext('thread', id));
    }

    // Soft delete - set status to deleted
    await db
      .update(tables.chatThread)
      .set({
        status: 'deleted',
        updatedAt: new Date(),
      })
      .where(eq(tables.chatThread.id, id));

    return Responses.ok(c, {
      deleted: true,
    });
  },
);

export const getPublicThreadHandler: RouteHandler<typeof getPublicThreadRoute, ApiEnv> = createHandler(
  {
    auth: 'public', // No authentication required for public threads
    operationName: 'getPublicThread',
  },
  async (c) => {
    const { slug } = ThreadSlugParamSchema.parse(c.req.param());
    const db = await getDbAsync();

    const thread = await db.query.chatThread.findFirst({
      where: eq(tables.chatThread.slug, slug),
    });

    if (!thread || !thread.isPublic) {
      throw createError.notFound(
        'Public thread not found',
        createResourceNotFoundContext('public_thread', slug),
      );
    }

    return Responses.ok(c, {
      thread,
    });
  },
);

// ============================================================================
// Participant Handlers
// ============================================================================

export const listParticipantsHandler: RouteHandler<typeof listParticipantsRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'listParticipants',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    const { id } = ThreadIdParamSchema.parse(c.req.param());
    const db = await getDbAsync();

    // Verify thread ownership
    const thread = await db.query.chatThread.findFirst({
      where: eq(tables.chatThread.id, id),
    });

    if (!thread) {
      throw createError.notFound('Thread not found', createResourceNotFoundContext('thread', id));
    }

    if (thread.userId !== user.id) {
      throw createError.unauthorized('Not authorized to access this thread', createAuthorizationErrorContext('thread', id));
    }

    const participants = await db.query.chatParticipant.findMany({
      where: eq(tables.chatParticipant.threadId, id),
      orderBy: [tables.chatParticipant.priority],
    });

    return Responses.ok(c, {
      participants,
      count: participants.length,
    });
  },
);

export const addParticipantHandler: RouteHandler<typeof addParticipantRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'addParticipant',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    const { id } = ThreadIdParamSchema.parse(c.req.param());
    const body = AddParticipantRequestSchema.parse(await c.req.json());
    const db = await getDbAsync();

    // Verify thread ownership
    const thread = await db.query.chatThread.findFirst({
      where: eq(tables.chatThread.id, id),
    });

    if (!thread) {
      throw createError.notFound('Thread not found', createResourceNotFoundContext('thread', id));
    }

    if (thread.userId !== user.id) {
      throw createError.unauthorized('Not authorized to modify this thread', createAuthorizationErrorContext('thread', id));
    }

    const participantId = ulid();
    const now = new Date();

    const [participant] = await db
      .insert(tables.chatParticipant)
      .values({
        id: participantId,
        threadId: id,
        modelId: body.modelId,
        role: body.role,
        priority: body.priority || 0,
        isEnabled: true,
        settings: body.settings,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return Responses.ok(c, {
      participant,
    });
  },
);

export const updateParticipantHandler: RouteHandler<typeof updateParticipantRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'updateParticipant',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    const { id } = ParticipantIdParamSchema.parse(c.req.param());
    const body = UpdateParticipantRequestSchema.parse(await c.req.json());
    const db = await getDbAsync();

    // Get participant and verify thread ownership
    const participant = await db.query.chatParticipant.findFirst({
      where: eq(tables.chatParticipant.id, id),
      with: {
        thread: true,
      },
    });

    if (!participant) {
      throw createError.notFound('Participant not found', createResourceNotFoundContext('participant', id));
    }

    if (participant.thread.userId !== user.id) {
      throw createError.unauthorized('Not authorized to modify this participant', createAuthorizationErrorContext('participant', id));
    }

    const [updatedParticipant] = await db
      .update(tables.chatParticipant)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(tables.chatParticipant.id, id))
      .returning();

    return Responses.ok(c, {
      participant: updatedParticipant,
    });
  },
);

export const deleteParticipantHandler: RouteHandler<typeof deleteParticipantRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'deleteParticipant',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    const { id } = ParticipantIdParamSchema.parse(c.req.param());
    const db = await getDbAsync();

    // Get participant and verify thread ownership
    const participant = await db.query.chatParticipant.findFirst({
      where: eq(tables.chatParticipant.id, id),
      with: {
        thread: true,
      },
    });

    if (!participant) {
      throw createError.notFound('Participant not found', createResourceNotFoundContext('participant', id));
    }

    if (participant.thread.userId !== user.id) {
      throw createError.unauthorized('Not authorized to delete this participant', createAuthorizationErrorContext('participant', id));
    }

    await db.delete(tables.chatParticipant).where(eq(tables.chatParticipant.id, id));

    return Responses.ok(c, {
      deleted: true,
    });
  },
);

// ============================================================================
// Message Handlers
// ============================================================================

export const listMessagesHandler: RouteHandler<typeof listMessagesRoute, ApiEnv> = createHandler(
  {
    auth: 'session-optional', // Allow both authenticated and unauthenticated access
    operationName: 'listMessages',
  },
  async (c) => {
    const user = c.var.user; // May be undefined for unauthenticated requests

    const { id } = ThreadIdParamSchema.parse(c.req.param());
    const db = await getDbAsync();

    // Get thread to check access permissions
    const thread = await db.query.chatThread.findFirst({
      where: eq(tables.chatThread.id, id),
    });

    if (!thread) {
      throw createError.notFound('Thread not found', createResourceNotFoundContext('thread', id));
    }

    // Smart access control: Public threads are accessible to anyone, private threads require ownership
    if (!thread.isPublic) {
      // Private thread - requires authentication and ownership
      if (!user) {
        throw createError.unauthenticated(
          'Authentication required to access private thread messages',
          createAuthErrorContext(),
        );
      }

      if (thread.userId !== user.id) {
        throw createError.unauthorized(
          'Not authorized to access this thread',
          createAuthorizationErrorContext('thread', id),
        );
      }
    }

    // Fetch messages (accessible for public threads or authorized private threads)
    const messages = await db.query.chatMessage.findMany({
      where: eq(tables.chatMessage.threadId, id),
      orderBy: [tables.chatMessage.createdAt],
    });

    return Responses.ok(c, {
      messages,
      count: messages.length,
    });
  },
);

export const sendMessageHandler: RouteHandler<typeof sendMessageRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'sendMessage',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    const { id } = ThreadIdParamSchema.parse(c.req.param());
    const body = SendMessageRequestSchema.parse(await c.req.json());
    const db = await getDbAsync();

    // Verify thread ownership and get thread details
    const thread = await db.query.chatThread.findFirst({
      where: eq(tables.chatThread.id, id),
      with: {
        participants: {
          where: eq(tables.chatParticipant.isEnabled, true),
          orderBy: [tables.chatParticipant.priority],
        },
      },
    });

    if (!thread) {
      throw createError.notFound('Thread not found', createResourceNotFoundContext('thread', id));
    }

    if (thread.userId !== user.id) {
      throw createError.unauthorized('Not authorized to send messages to this thread', createAuthorizationErrorContext('thread', id));
    }

    if (thread.participants.length === 0) {
      throw createError.badRequest('No enabled participants in this thread');
    }

    // Enforce message creation quota BEFORE creating the message
    // This counts as 1 user message + N assistant messages from participants
    await enforceMessageQuota(user.id);

    // Create user message
    const userMessageId = ulid();
    const now = new Date();

    const [userMessage] = await db
      .insert(tables.chatMessage)
      .values({
        id: userMessageId,
        threadId: id,
        participantId: null,
        role: 'user',
        content: body.content,
        parentMessageId: body.parentMessageId,
        createdAt: now,
      })
      .returning();

    // Get previous messages for conversation context
    const previousMessages = await db.query.chatMessage.findMany({
      where: eq(tables.chatMessage.threadId, id),
      orderBy: [tables.chatMessage.createdAt],
      limit: 10, // Last 10 messages for context
    });

    // Auto-generate thread title from first user message (like ChatGPT)
    // Only generate if this is the first message and thread has default title
    const isFirstMessage = previousMessages.length === 1; // Only the message we just created
    if (isFirstMessage && thread.title === 'New Chat') {
      // Generate title in background (don't block response)
      autoGenerateThreadTitle(id, body.content, c.env).catch((error) => {
        // Log error but don't fail the request
        apiLogger.error('Failed to auto-generate thread title', {
          threadId: id,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    // Build conversation context
    const conversationMessages: AIMessage[] = previousMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Add the new user message to context
    conversationMessages.push({
      role: 'user',
      content: body.content,
    });

    // Initialize OpenRouter service with API key
    initializeOpenRouter(c.env);

    // Orchestrate multi-model responses
    const orchestrationResults = await openRouterService.orchestrateMultiModel(
      thread.participants.map((p: typeof thread.participants[number]) => ({
        participantId: p.id,
        modelId: p.modelId,
        role: p.role,
        priority: p.priority,
        systemPrompt: p.settings?.systemPrompt,
        temperature: p.settings?.temperature,
        maxTokens: p.settings?.maxTokens,
      })),
      conversationMessages,
      thread.mode,
    );

    // Save assistant messages to database
    const assistantMessages = await Promise.all(
      orchestrationResults.map(async (result) => {
        const messageId = ulid();
        const [message] = await db
          .insert(tables.chatMessage)
          .values({
            id: messageId,
            threadId: id,
            participantId: result.participantId,
            role: 'assistant',
            content: result.text,
            metadata: {
              model: result.modelId,
              finishReason: result.finishReason,
              usage: result.usage,
            },
            createdAt: now,
          })
          .returning();

        return message;
      }),
    );

    // Increment message usage counter AFTER successful creation
    // Count: 1 user message + number of assistant messages
    const totalMessagesCreated = 1 + assistantMessages.length;
    await incrementMessageUsage(user.id, totalMessagesCreated);

    // Update thread lastMessageAt
    await db
      .update(tables.chatThread)
      .set({
        lastMessageAt: now,
        updatedAt: now,
      })
      .where(eq(tables.chatThread.id, id));

    return Responses.ok(c, {
      userMessage,
      assistantMessages,
    });
  },
);

export const getMessageHandler: RouteHandler<typeof getMessageRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'getMessage',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    const { id } = MessageIdParamSchema.parse(c.req.param());
    const db = await getDbAsync();

    const message = await db.query.chatMessage.findFirst({
      where: eq(tables.chatMessage.id, id),
      with: {
        thread: true,
      },
    });

    if (!message) {
      throw createError.notFound('Message not found', createResourceNotFoundContext('message', id));
    }

    if (message.thread.userId !== user.id) {
      throw createError.unauthorized('Not authorized to access this message', createAuthorizationErrorContext('message', id));
    }

    return Responses.ok(c, {
      message,
    });
  },
);

// ============================================================================
// Memory Handlers
// ============================================================================

export const listMemoriesHandler: RouteHandler<typeof listMemoriesRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'listMemories',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    const db = await getDbAsync();

    const memories = await db.query.chatMemory.findMany({
      where: eq(tables.chatMemory.userId, user.id),
      orderBy: [desc(tables.chatMemory.updatedAt)],
    });

    return Responses.ok(c, {
      memories,
      count: memories.length,
    });
  },
);

export const createMemoryHandler: RouteHandler<typeof createMemoryRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'createMemory',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    const body = CreateMemoryRequestSchema.parse(await c.req.json());
    const db = await getDbAsync();

    const memoryId = ulid();
    const now = new Date();

    const [memory] = await db
      .insert(tables.chatMemory)
      .values({
        id: memoryId,
        userId: user.id,
        threadId: body.threadId,
        type: body.type || 'topic',
        title: body.title,
        content: body.content,
        isGlobal: body.isGlobal || false,
        metadata: body.metadata,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return Responses.ok(c, {
      memory,
    });
  },
);

export const getMemoryHandler: RouteHandler<typeof getMemoryRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'getMemory',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    const { id } = MemoryIdParamSchema.parse(c.req.param());
    const db = await getDbAsync();

    const memory = await db.query.chatMemory.findFirst({
      where: eq(tables.chatMemory.id, id),
    });

    if (!memory) {
      throw createError.notFound('Memory not found', createResourceNotFoundContext('memory', id));
    }

    if (memory.userId !== user.id) {
      throw createError.unauthorized('Not authorized to access this memory', createAuthorizationErrorContext('memory', id));
    }

    return Responses.ok(c, {
      memory,
    });
  },
);

export const updateMemoryHandler: RouteHandler<typeof updateMemoryRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'updateMemory',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    const { id } = MemoryIdParamSchema.parse(c.req.param());
    const body = UpdateMemoryRequestSchema.parse(await c.req.json());
    const db = await getDbAsync();

    const existingMemory = await db.query.chatMemory.findFirst({
      where: eq(tables.chatMemory.id, id),
    });

    if (!existingMemory) {
      throw createError.notFound('Memory not found', createResourceNotFoundContext('memory', id));
    }

    if (existingMemory.userId !== user.id) {
      throw createError.unauthorized('Not authorized to update this memory', createAuthorizationErrorContext('memory', id));
    }

    const [updatedMemory] = await db
      .update(tables.chatMemory)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(tables.chatMemory.id, id))
      .returning();

    return Responses.ok(c, {
      memory: updatedMemory,
    });
  },
);

export const deleteMemoryHandler: RouteHandler<typeof deleteMemoryRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'deleteMemory',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    const { id } = MemoryIdParamSchema.parse(c.req.param());
    const db = await getDbAsync();

    const existingMemory = await db.query.chatMemory.findFirst({
      where: eq(tables.chatMemory.id, id),
    });

    if (!existingMemory) {
      throw createError.notFound('Memory not found', createResourceNotFoundContext('memory', id));
    }

    if (existingMemory.userId !== user.id) {
      throw createError.unauthorized('Not authorized to delete this memory', createAuthorizationErrorContext('memory', id));
    }

    await db.delete(tables.chatMemory).where(eq(tables.chatMemory.id, id));

    return Responses.ok(c, {
      deleted: true,
    });
  },
);
