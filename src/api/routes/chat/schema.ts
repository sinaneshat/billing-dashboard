import { z } from '@hono/zod-openapi';

import { CoreSchemas, createApiResponseSchema } from '@/api/core/schemas';

// ============================================================================
// Path Parameter Schemas
// ============================================================================

export const ThreadIdParamSchema = z.object({
  id: CoreSchemas.id().openapi({
    description: 'Chat thread ID',
    example: 'thread_abc123',
  }),
});

export const ParticipantIdParamSchema = z.object({
  id: CoreSchemas.id().openapi({
    description: 'Chat participant ID',
    example: 'participant_abc123',
  }),
});

export const MessageIdParamSchema = z.object({
  id: CoreSchemas.id().openapi({
    description: 'Chat message ID',
    example: 'msg_abc123',
  }),
});

export const MemoryIdParamSchema = z.object({
  id: CoreSchemas.id().openapi({
    description: 'Chat memory ID',
    example: 'memory_abc123',
  }),
});

// ============================================================================
// Base Entity Schemas (ordered for dependencies)
// ============================================================================

// Participant Schema (needed by ThreadDetailPayloadSchema)
const ChatParticipantSchema = z.object({
  id: z.string().openapi({
    description: 'Participant ID',
    example: 'participant_abc123',
  }),
  threadId: z.string().openapi({
    description: 'Thread ID',
    example: 'thread_abc123',
  }),
  modelId: z.string().openapi({
    description: 'Model ID (e.g., claude-sonnet-4.1, gpt-5)',
    example: 'claude-sonnet-4.1',
  }),
  role: z.string().openapi({
    description: 'Assigned role for this model',
    example: 'The Ideator',
  }),
  priority: z.number().int().nonnegative().openapi({
    description: 'Response priority (lower = responds first)',
    example: 0,
  }),
  isEnabled: z.boolean().openapi({
    description: 'Whether this participant is active',
    example: true,
  }),
  settings: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    systemPrompt: z.string().optional(),
  }).passthrough().nullable().openapi({
    description: 'Model-specific settings',
  }),
  createdAt: CoreSchemas.timestamp().openapi({
    description: 'Participant creation timestamp',
  }),
  updatedAt: CoreSchemas.timestamp().openapi({
    description: 'Participant last update timestamp',
  }),
}).openapi('ChatParticipant');

// Message Schema (needed by ThreadDetailPayloadSchema)
const ChatMessageSchema = z.object({
  id: z.string().openapi({
    description: 'Message ID',
    example: 'msg_abc123',
  }),
  threadId: z.string().openapi({
    description: 'Thread ID',
    example: 'thread_abc123',
  }),
  participantId: z.string().nullable().openapi({
    description: 'Participant ID (null for user messages)',
    example: 'participant_abc123',
  }),
  role: z.enum(['user', 'assistant']).openapi({
    description: 'Message role',
    example: 'assistant',
  }),
  content: z.string().openapi({
    description: 'Message content',
    example: 'Here are some innovative ideas...',
  }),
  reasoning: z.string().nullable().openapi({
    description: 'Model reasoning/thinking process (for models that support it)',
    example: null,
  }),
  toolCalls: z.array(z.object({
    id: z.string(),
    type: z.string(),
    function: z.object({
      name: z.string(),
      arguments: z.string(),
    }),
  })).nullable().openapi({
    description: 'Tool/function calls made by the model',
  }),
  metadata: z.object({
    model: z.string().optional(),
    finishReason: z.string().optional(),
    usage: z.object({
      promptTokens: z.number().optional(),
      completionTokens: z.number().optional(),
      totalTokens: z.number().optional(),
    }).optional(),
  }).passthrough().nullable().openapi({
    description: 'Message metadata (model, usage stats, etc.)',
  }),
  parentMessageId: z.string().nullable().openapi({
    description: 'Parent message ID (for threading)',
    example: null,
  }),
  createdAt: CoreSchemas.timestamp().openapi({
    description: 'Message creation timestamp',
  }),
}).openapi('ChatMessage');

// ============================================================================
// Thread Schemas
// ============================================================================

const ChatThreadSchema = z.object({
  id: z.string().openapi({
    description: 'Thread ID',
    example: 'thread_abc123',
  }),
  userId: z.string().openapi({
    description: 'User ID who owns the thread',
    example: 'user_123',
  }),
  title: z.string().openapi({
    description: 'Thread title',
    example: 'Product strategy brainstorm',
  }),
  slug: z.string().openapi({
    description: 'SEO-friendly URL slug',
    example: 'product-strategy-brainstorm-abc123',
  }),
  mode: z.enum(['analyzing', 'brainstorming', 'debating', 'solving']).openapi({
    description: 'Conversation mode that determines how models interact',
    example: 'brainstorming',
  }),
  status: z.enum(['active', 'archived', 'deleted']).openapi({
    description: 'Thread status',
    example: 'active',
  }),
  isFavorite: z.boolean().openapi({
    description: 'Whether thread is marked as favorite',
    example: false,
  }),
  isPublic: z.boolean().openapi({
    description: 'Whether thread is publicly accessible',
    example: false,
  }),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    summary: z.string().optional(),
  }).passthrough().nullable().openapi({
    description: 'Thread metadata (tags, summary, etc.)',
  }),
  createdAt: CoreSchemas.timestamp().openapi({
    description: 'Thread creation timestamp',
  }),
  updatedAt: CoreSchemas.timestamp().openapi({
    description: 'Thread last update timestamp',
  }),
  lastMessageAt: CoreSchemas.timestamp().nullable().openapi({
    description: 'Last message timestamp',
  }),
}).openapi('ChatThread');

export const CreateThreadRequestSchema = z.object({
  title: z.string().min(1).max(200).optional().default('New Chat').openapi({
    description: 'Thread title (auto-generated from first message if "New Chat")',
    example: 'Product strategy brainstorm',
  }),
  mode: z.enum(['analyzing', 'brainstorming', 'debating', 'solving']).optional().default('brainstorming').openapi({
    description: 'Conversation mode',
    example: 'brainstorming',
  }),
  participants: z.array(z.object({
    modelId: z.string().openapi({
      description: 'Model ID (e.g., anthropic/claude-3.5-sonnet)',
      example: 'anthropic/claude-3.5-sonnet',
    }),
    role: z.string().openapi({
      description: 'Assigned role for this model (immutable)',
      example: 'The Ideator',
    }),
    systemPrompt: z.string().optional().openapi({
      description: 'Optional system prompt override',
    }),
    temperature: z.number().min(0).max(2).optional().openapi({
      description: 'Temperature setting',
    }),
    maxTokens: z.number().int().positive().optional().openapi({
      description: 'Max tokens setting',
    }),
  })).min(1).openapi({
    description: 'Participants array (order determines priority - immutable after creation)',
  }),
  firstMessage: z.string().min(1).openapi({
    description: 'Initial user message to start the conversation',
    example: 'What are innovative product ideas for sustainability?',
  }),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    summary: z.string().optional(),
  }).passthrough().optional().openapi({
    description: 'Thread metadata',
  }),
}).openapi('CreateThreadRequest');

export const UpdateThreadRequestSchema = z.object({
  title: z.string().min(1).max(200).optional().openapi({
    description: 'Thread title',
    example: 'Updated brainstorm session',
  }),
  mode: z.enum(['analyzing', 'brainstorming', 'debating', 'solving']).optional().openapi({
    description: 'Conversation mode',
    example: 'debating',
  }),
  status: z.enum(['active', 'archived', 'deleted']).optional().openapi({
    description: 'Thread status',
    example: 'archived',
  }),
  isFavorite: z.boolean().optional().openapi({
    description: 'Whether thread is marked as favorite',
    example: true,
  }),
  isPublic: z.boolean().optional().openapi({
    description: 'Whether thread is publicly accessible',
    example: false,
  }),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    summary: z.string().optional(),
  }).passthrough().optional().openapi({
    description: 'Thread metadata',
  }),
}).openapi('UpdateThreadRequest');

export const ThreadSlugParamSchema = z.object({
  slug: z.string().openapi({
    description: 'Thread slug for public access',
    example: 'product-strategy-brainstorm-abc123',
  }),
}).openapi('ThreadSlugParam');

// Query parameters for infinite scroll
export const ThreadListQuerySchema = z.object({
  cursor: z.string().optional().openapi({
    description: 'Cursor for pagination (thread ID)',
    example: 'thread_abc123',
  }),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20).openapi({
    description: 'Number of threads to return per page',
    example: 20,
  }),
}).openapi('ThreadListQuery');

// Thread list response with cursor pagination for infinite scroll
const ThreadListPayloadSchema = z.object({
  threads: z.array(ChatThreadSchema).openapi({
    description: 'List of chat threads',
  }),
  nextCursor: z.string().nullable().openapi({
    description: 'Cursor for next page (null if no more pages)',
    example: 'thread_xyz789',
  }),
}).openapi('ThreadListPayload');

// Thread detail with participants and messages
const ThreadDetailPayloadSchema = z.object({
  thread: ChatThreadSchema.openapi({
    description: 'Thread details',
  }),
  participants: z.array(ChatParticipantSchema).openapi({
    description: 'Thread participants (AI models with roles)',
  }),
  messages: z.array(ChatMessageSchema).openapi({
    description: 'Thread messages',
  }),
}).openapi('ThreadDetailPayload');

export const ThreadListResponseSchema = createApiResponseSchema(ThreadListPayloadSchema).openapi('ThreadListResponse');
export const ThreadDetailResponseSchema = createApiResponseSchema(ThreadDetailPayloadSchema).openapi('ThreadDetailResponse');

// ============================================================================
// Participant Schemas
// ============================================================================

export const AddParticipantRequestSchema = z.object({
  modelId: z.string().min(1).openapi({
    description: 'Model ID to add',
    example: 'claude-sonnet-4.1',
  }),
  role: z.string().min(1).max(100).openapi({
    description: 'Assigned role',
    example: 'The Ideator',
  }),
  priority: z.number().int().nonnegative().optional().default(0).openapi({
    description: 'Response priority',
    example: 0,
  }),
  settings: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    systemPrompt: z.string().optional(),
  }).passthrough().optional().openapi({
    description: 'Model settings override',
  }),
}).openapi('AddParticipantRequest');

export const UpdateParticipantRequestSchema = z.object({
  role: z.string().min(1).max(100).optional().openapi({
    description: 'Updated role',
    example: 'Devil\'s Advocate',
  }),
  priority: z.number().int().nonnegative().optional().openapi({
    description: 'Updated priority',
    example: 1,
  }),
  isEnabled: z.boolean().optional().openapi({
    description: 'Enable/disable participant',
    example: true,
  }),
  settings: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    systemPrompt: z.string().optional(),
  }).passthrough().optional().openapi({
    description: 'Updated model settings',
  }),
}).openapi('UpdateParticipantRequest');

const ParticipantListPayloadSchema = z.object({
  participants: z.array(ChatParticipantSchema).openapi({
    description: 'List of thread participants',
  }),
  count: z.number().int().nonnegative().openapi({
    description: 'Total number of participants',
    example: 3,
  }),
}).openapi('ParticipantListPayload');

const ParticipantDetailPayloadSchema = z.object({
  participant: ChatParticipantSchema.openapi({
    description: 'Participant details',
  }),
}).openapi('ParticipantDetailPayload');

export const ParticipantListResponseSchema = createApiResponseSchema(ParticipantListPayloadSchema).openapi('ParticipantListResponse');
export const ParticipantDetailResponseSchema = createApiResponseSchema(ParticipantDetailPayloadSchema).openapi('ParticipantDetailResponse');

// ============================================================================
// Message Schemas
// ============================================================================

export const SendMessageRequestSchema = z.object({
  content: z.string().min(1).openapi({
    description: 'User message content',
    example: 'What are some innovative product ideas for sustainability?',
  }),
  parentMessageId: z.string().optional().openapi({
    description: 'Parent message ID for threading',
    example: 'msg_parent123',
  }),
}).openapi('SendMessageRequest');

const MessageListPayloadSchema = z.object({
  messages: z.array(ChatMessageSchema).openapi({
    description: 'List of thread messages',
  }),
  count: z.number().int().nonnegative().openapi({
    description: 'Total number of messages',
    example: 12,
  }),
}).openapi('MessageListPayload');

const MessageDetailPayloadSchema = z.object({
  message: ChatMessageSchema.openapi({
    description: 'Message details',
  }),
}).openapi('MessageDetailPayload');

const SendMessagePayloadSchema = z.object({
  userMessage: ChatMessageSchema.openapi({
    description: 'User message that was sent',
  }),
  assistantMessages: z.array(ChatMessageSchema).openapi({
    description: 'Assistant responses from all participants',
  }),
}).openapi('SendMessagePayload');

export const MessageListResponseSchema = createApiResponseSchema(MessageListPayloadSchema).openapi('MessageListResponse');
export const MessageDetailResponseSchema = createApiResponseSchema(MessageDetailPayloadSchema).openapi('MessageDetailResponse');
export const SendMessageResponseSchema = createApiResponseSchema(SendMessagePayloadSchema).openapi('SendMessageResponse');

// ============================================================================
// Memory Schemas
// ============================================================================

const ChatMemorySchema = z.object({
  id: z.string().openapi({
    description: 'Memory ID',
    example: 'memory_abc123',
  }),
  userId: z.string().openapi({
    description: 'User ID who owns the memory',
    example: 'user_123',
  }),
  threadId: z.string().nullable().openapi({
    description: 'Thread ID (null for global memories)',
    example: 'thread_abc123',
  }),
  type: z.enum(['personal', 'topic', 'instruction', 'fact']).openapi({
    description: 'Memory type',
    example: 'topic',
  }),
  title: z.string().openapi({
    description: 'Memory title',
    example: 'Product development preferences',
  }),
  content: z.string().openapi({
    description: 'Memory content',
    example: 'Focus on sustainability and eco-friendly solutions',
  }),
  isGlobal: z.boolean().openapi({
    description: 'Whether memory applies to all threads',
    example: false,
  }),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    relevance: z.number().optional(),
  }).passthrough().nullable().openapi({
    description: 'Memory metadata',
  }),
  createdAt: CoreSchemas.timestamp().openapi({
    description: 'Memory creation timestamp',
  }),
  updatedAt: CoreSchemas.timestamp().openapi({
    description: 'Memory last update timestamp',
  }),
}).openapi('ChatMemory');

export const CreateMemoryRequestSchema = z.object({
  threadId: z.string().optional().openapi({
    description: 'Thread ID (omit for global memory)',
    example: 'thread_abc123',
  }),
  type: z.enum(['personal', 'topic', 'instruction', 'fact']).optional().default('topic').openapi({
    description: 'Memory type',
    example: 'topic',
  }),
  title: z.string().min(1).max(200).openapi({
    description: 'Memory title',
    example: 'Product preferences',
  }),
  content: z.string().min(1).openapi({
    description: 'Memory content',
    example: 'Focus on sustainability',
  }),
  isGlobal: z.boolean().optional().default(false).openapi({
    description: 'Apply to all threads',
    example: false,
  }),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
  }).passthrough().optional().openapi({
    description: 'Memory metadata',
  }),
}).openapi('CreateMemoryRequest');

export const UpdateMemoryRequestSchema = z.object({
  title: z.string().min(1).max(200).optional().openapi({
    description: 'Updated memory title',
  }),
  content: z.string().min(1).optional().openapi({
    description: 'Updated memory content',
  }),
  type: z.enum(['personal', 'topic', 'instruction', 'fact']).optional().openapi({
    description: 'Updated memory type',
  }),
  isGlobal: z.boolean().optional().openapi({
    description: 'Update global status',
  }),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
  }).passthrough().optional().openapi({
    description: 'Updated metadata',
  }),
}).openapi('UpdateMemoryRequest');

const MemoryListPayloadSchema = z.object({
  memories: z.array(ChatMemorySchema).openapi({
    description: 'List of memories',
  }),
  count: z.number().int().nonnegative().openapi({
    description: 'Total number of memories',
    example: 4,
  }),
}).openapi('MemoryListPayload');

const MemoryDetailPayloadSchema = z.object({
  memory: ChatMemorySchema.openapi({
    description: 'Memory details',
  }),
}).openapi('MemoryDetailPayload');

export const MemoryListResponseSchema = createApiResponseSchema(MemoryListPayloadSchema).openapi('MemoryListResponse');
export const MemoryDetailResponseSchema = createApiResponseSchema(MemoryDetailPayloadSchema).openapi('MemoryDetailResponse');

// ============================================================================
// TYPE EXPORTS FOR FRONTEND & BACKEND
// ============================================================================

export type ChatThread = z.infer<typeof ChatThreadSchema>;
export type CreateThreadRequest = z.infer<typeof CreateThreadRequestSchema>;
export type UpdateThreadRequest = z.infer<typeof UpdateThreadRequestSchema>;

export type ChatParticipant = z.infer<typeof ChatParticipantSchema>;
export type AddParticipantRequest = z.infer<typeof AddParticipantRequestSchema>;
export type UpdateParticipantRequest = z.infer<typeof UpdateParticipantRequestSchema>;

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

export type ChatMemory = z.infer<typeof ChatMemorySchema>;
export type CreateMemoryRequest = z.infer<typeof CreateMemoryRequestSchema>;
export type UpdateMemoryRequest = z.infer<typeof UpdateMemoryRequestSchema>;
