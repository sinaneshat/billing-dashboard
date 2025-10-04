import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { createApiResponseSchema } from '@/api/core/schemas';

import {
  AddParticipantRequestSchema,
  CreateMemoryRequestSchema,
  CreateThreadRequestSchema,
  MemoryDetailResponseSchema,
  MemoryIdParamSchema,
  MemoryListResponseSchema,
  MessageDetailResponseSchema,
  MessageIdParamSchema,
  MessageListResponseSchema,
  ParticipantDetailResponseSchema,
  ParticipantIdParamSchema,
  ParticipantListResponseSchema,
  SendMessageRequestSchema,
  SendMessageResponseSchema,
  ThreadDetailResponseSchema,
  ThreadIdParamSchema,
  ThreadListQuerySchema,
  ThreadListResponseSchema,
  ThreadSlugParamSchema,
  UpdateMemoryRequestSchema,
  UpdateParticipantRequestSchema,
  UpdateThreadRequestSchema,
} from './schema';

// ============================================================================
// Thread Routes
// ============================================================================

export const listThreadsRoute = createRoute({
  method: 'get',
  path: '/chat/threads',
  tags: ['chat'],
  summary: 'List chat threads with cursor pagination',
  description: 'Get chat threads for the authenticated user with infinite scroll support',
  request: {
    query: ThreadListQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Threads retrieved successfully with pagination cursor',
      content: {
        'application/json': { schema: ThreadListResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const createThreadRoute = createRoute({
  method: 'post',
  path: '/chat/threads',
  tags: ['chat'],
  summary: 'Create chat thread',
  description: 'Create a new chat thread with specified mode and configuration',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateThreadRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Thread created successfully',
      content: {
        'application/json': { schema: ThreadDetailResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Invalid request data' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const getThreadRoute = createRoute({
  method: 'get',
  path: '/chat/threads/:id',
  tags: ['chat'],
  summary: 'Get thread details',
  description: 'Get details of a specific chat thread',
  request: {
    params: ThreadIdParamSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Thread retrieved successfully',
      content: {
        'application/json': { schema: ThreadDetailResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Thread not found' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const updateThreadRoute = createRoute({
  method: 'patch',
  path: '/chat/threads/:id',
  tags: ['chat'],
  summary: 'Update thread',
  description: 'Update thread title, mode, status, or metadata',
  request: {
    params: ThreadIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateThreadRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Thread updated successfully',
      content: {
        'application/json': { schema: ThreadDetailResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Thread not found' },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Invalid request data' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const deleteThreadRoute = createRoute({
  method: 'delete',
  path: '/chat/threads/:id',
  tags: ['chat'],
  summary: 'Delete thread',
  description: 'Delete a chat thread (soft delete - sets status to deleted)',
  request: {
    params: ThreadIdParamSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Thread deleted successfully',
      content: {
        'application/json': {
          schema: createApiResponseSchema(z.object({
            deleted: z.boolean().openapi({ example: true }),
          })),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Thread not found' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const getPublicThreadRoute = createRoute({
  method: 'get',
  path: '/chat/public/:slug',
  tags: ['chat'],
  summary: 'Get public thread by slug',
  description: 'Get a publicly shared thread without authentication (read-only)',
  request: {
    params: ThreadSlugParamSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Public thread retrieved successfully',
      content: {
        'application/json': { schema: ThreadDetailResponseSchema },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Public thread not found or not public' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

// ============================================================================
// Participant Routes
// ============================================================================

export const listParticipantsRoute = createRoute({
  method: 'get',
  path: '/chat/threads/:id/participants',
  tags: ['chat'],
  summary: 'List thread participants',
  description: 'Get all participants (AI models with roles) in a thread',
  request: {
    params: ThreadIdParamSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Participants retrieved successfully',
      content: {
        'application/json': { schema: ParticipantListResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Thread not found' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const addParticipantRoute = createRoute({
  method: 'post',
  path: '/chat/threads/:id/participants',
  tags: ['chat'],
  summary: 'Add participant to thread',
  description: 'Add an AI model with a role to the thread',
  request: {
    params: ThreadIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: AddParticipantRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Participant added successfully',
      content: {
        'application/json': { schema: ParticipantDetailResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Thread not found' },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Invalid model ID or request data' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const updateParticipantRoute = createRoute({
  method: 'patch',
  path: '/chat/participants/:id',
  tags: ['chat'],
  summary: 'Update participant',
  description: 'Update participant role, priority, or settings',
  request: {
    params: ParticipantIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateParticipantRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Participant updated successfully',
      content: {
        'application/json': { schema: ParticipantDetailResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Participant not found' },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Invalid request data' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const deleteParticipantRoute = createRoute({
  method: 'delete',
  path: '/chat/participants/:id',
  tags: ['chat'],
  summary: 'Remove participant',
  description: 'Remove a participant from the thread',
  request: {
    params: ParticipantIdParamSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Participant removed successfully',
      content: {
        'application/json': {
          schema: createApiResponseSchema(z.object({
            deleted: z.boolean().openapi({ example: true }),
          })),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Participant not found' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

// ============================================================================
// Message Routes
// ============================================================================

export const listMessagesRoute = createRoute({
  method: 'get',
  path: '/chat/threads/:id/messages',
  tags: ['chat'],
  summary: 'List thread messages',
  description: 'Get all messages in a thread',
  request: {
    params: ThreadIdParamSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Messages retrieved successfully',
      content: {
        'application/json': { schema: MessageListResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Thread not found' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const sendMessageRoute = createRoute({
  method: 'post',
  path: '/chat/threads/:id/messages',
  tags: ['chat'],
  summary: 'Send message',
  description: 'Send a user message and receive responses from all enabled participants',
  request: {
    params: ThreadIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: SendMessageRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Message sent and responses received',
      content: {
        'application/json': { schema: SendMessageResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Thread not found' },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Invalid request data or no participants enabled' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const getMessageRoute = createRoute({
  method: 'get',
  path: '/chat/messages/:id',
  tags: ['chat'],
  summary: 'Get message details',
  description: 'Get details of a specific message',
  request: {
    params: MessageIdParamSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Message retrieved successfully',
      content: {
        'application/json': { schema: MessageDetailResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Message not found' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

// ============================================================================
// Memory Routes
// ============================================================================

export const listMemoriesRoute = createRoute({
  method: 'get',
  path: '/chat/memories',
  tags: ['chat'],
  summary: 'List memories',
  description: 'Get all memories for the authenticated user (global and thread-specific)',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Memories retrieved successfully',
      content: {
        'application/json': { schema: MemoryListResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const createMemoryRoute = createRoute({
  method: 'post',
  path: '/chat/memories',
  tags: ['chat'],
  summary: 'Create memory',
  description: 'Create a new memory (user note, context, instruction) for AI models',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateMemoryRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Memory created successfully',
      content: {
        'application/json': { schema: MemoryDetailResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Invalid request data' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const getMemoryRoute = createRoute({
  method: 'get',
  path: '/chat/memories/:id',
  tags: ['chat'],
  summary: 'Get memory details',
  description: 'Get details of a specific memory',
  request: {
    params: MemoryIdParamSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Memory retrieved successfully',
      content: {
        'application/json': { schema: MemoryDetailResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Memory not found' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const updateMemoryRoute = createRoute({
  method: 'patch',
  path: '/chat/memories/:id',
  tags: ['chat'],
  summary: 'Update memory',
  description: 'Update memory title, content, type, or metadata',
  request: {
    params: MemoryIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateMemoryRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Memory updated successfully',
      content: {
        'application/json': { schema: MemoryDetailResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Memory not found' },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Invalid request data' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const deleteMemoryRoute = createRoute({
  method: 'delete',
  path: '/chat/memories/:id',
  tags: ['chat'],
  summary: 'Delete memory',
  description: 'Delete a memory',
  request: {
    params: MemoryIdParamSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Memory deleted successfully',
      content: {
        'application/json': {
          schema: createApiResponseSchema(z.object({
            deleted: z.boolean().openapi({ example: true }),
          })),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Memory not found' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});
