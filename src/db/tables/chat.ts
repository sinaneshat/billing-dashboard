import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { user } from './auth';

/**
 * Chat Threads
 * Container for multi-model conversations with configuration
 */
export const chatThread = sqliteTable('chat_thread', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(), // SEO-friendly URL slug (e.g., "product-strategy-abc123")
  mode: text('mode', { enum: ['analyzing', 'brainstorming', 'debating', 'solving'] })
    .notNull()
    .default('brainstorming'),
  status: text('status', { enum: ['active', 'archived', 'deleted'] })
    .notNull()
    .default('active'),
  isFavorite: integer('is_favorite', { mode: 'boolean' })
    .notNull()
    .default(false), // User can mark threads as favorites
  isPublic: integer('is_public', { mode: 'boolean' })
    .notNull()
    .default(false), // Public threads can be viewed without authentication
  metadata: text('metadata', { mode: 'json' }).$type<{
    tags?: string[];
    summary?: string;
    [key: string]: unknown;
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .defaultNow()
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  lastMessageAt: integer('last_message_at', { mode: 'timestamp' }),
}, table => [
  index('chat_thread_user_idx').on(table.userId),
  index('chat_thread_status_idx').on(table.status),
  index('chat_thread_updated_idx').on(table.updatedAt),
  index('chat_thread_slug_idx').on(table.slug), // Fast lookups by slug for public sharing
  index('chat_thread_favorite_idx').on(table.isFavorite),
  index('chat_thread_public_idx').on(table.isPublic),
]);

/**
 * Chat Participants
 * Models participating in a thread with their assigned roles
 */
export const chatParticipant = sqliteTable('chat_participant', {
  id: text('id').primaryKey(),
  threadId: text('thread_id')
    .notNull()
    .references(() => chatThread.id, { onDelete: 'cascade' }),
  modelId: text('model_id').notNull(), // e.g., 'anthropic/claude-3.5-sonnet'
  role: text('role').notNull(), // User-assigned role from screenshot (The Ideator, Devil's Advocate, etc.)
  priority: integer('priority').notNull().default(0), // Order in which models respond
  isEnabled: integer('is_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  settings: text('settings', { mode: 'json' }).$type<{
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    [key: string]: unknown;
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .defaultNow()
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}, table => [
  index('chat_participant_thread_idx').on(table.threadId),
  index('chat_participant_priority_idx').on(table.priority),
]);

/**
 * Chat Messages
 * Individual messages in threads (user input + model responses)
 */
export const chatMessage = sqliteTable('chat_message', {
  id: text('id').primaryKey(),
  threadId: text('thread_id')
    .notNull()
    .references(() => chatThread.id, { onDelete: 'cascade' }),
  participantId: text('participant_id')
    .references(() => chatParticipant.id, { onDelete: 'set null' }), // null for user messages
  role: text('role', { enum: ['user', 'assistant'] })
    .notNull()
    .default('assistant'),
  content: text('content').notNull(),
  reasoning: text('reasoning'), // For Claude extended thinking, GPT reasoning tokens
  toolCalls: text('tool_calls', { mode: 'json' }).$type<Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>>(),
  metadata: text('metadata', { mode: 'json' }).$type<{
    model?: string;
    finishReason?: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    [key: string]: unknown;
  }>(),
  parentMessageId: text('parent_message_id')
    // Self-reference for message threading - TypeScript has issues with circular refs
    .references((): ReturnType<typeof text> => chatMessage.id as ReturnType<typeof text>, {
      onDelete: 'set null',
    }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .defaultNow()
    .notNull(),
}, table => [
  index('chat_message_thread_idx').on(table.threadId),
  index('chat_message_created_idx').on(table.createdAt),
  index('chat_message_participant_idx').on(table.participantId),
]);

/**
 * Chat Memories
 * User-provided context, notes, and memories for threads
 */
export const chatMemory = sqliteTable('chat_memory', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  threadId: text('thread_id')
    .references(() => chatThread.id, { onDelete: 'cascade' }), // null = global memory
  type: text('type', { enum: ['personal', 'topic', 'instruction', 'fact'] })
    .notNull()
    .default('topic'),
  title: text('title').notNull(),
  content: text('content').notNull(),
  isGlobal: integer('is_global', { mode: 'boolean' })
    .notNull()
    .default(false), // If true, applies to all threads
  metadata: text('metadata', { mode: 'json' }).$type<{
    tags?: string[];
    relevance?: number;
    [key: string]: unknown;
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .defaultNow()
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}, table => [
  index('chat_memory_user_idx').on(table.userId),
  index('chat_memory_thread_idx').on(table.threadId),
  index('chat_memory_global_idx').on(table.isGlobal),
]);

/**
 * Model Configurations
 * Supported models and their default settings
 */
export const modelConfiguration = sqliteTable('model_configuration', {
  id: text('id').primaryKey(),
  provider: text('provider', { enum: ['openrouter', 'anthropic', 'openai', 'google', 'xai', 'perplexity'] })
    .notNull(),
  modelId: text('model_id').notNull().unique(), // Full model ID (e.g., 'anthropic/claude-3.5-sonnet')
  name: text('name').notNull(), // Display name
  description: text('description'),
  capabilities: text('capabilities', { mode: 'json' }).$type<{
    streaming?: boolean;
    tools?: boolean;
    vision?: boolean;
    reasoning?: boolean;
  }>(),
  defaultSettings: text('default_settings', { mode: 'json' }).$type<{
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    [key: string]: unknown;
  }>(),
  isEnabled: integer('is_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  order: integer('order').notNull().default(0), // Display order
  metadata: text('metadata', { mode: 'json' }).$type<{
    icon?: string;
    color?: string;
    category?: string;
    [key: string]: unknown;
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .defaultNow()
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}, table => [
  index('model_configuration_provider_idx').on(table.provider),
  index('model_configuration_enabled_idx').on(table.isEnabled),
]);

/**
 * Drizzle Relations for improved query support
 */
export const chatThreadRelations = relations(chatThread, ({ one, many }) => ({
  user: one(user, {
    fields: [chatThread.userId],
    references: [user.id],
  }),
  participants: many(chatParticipant),
  messages: many(chatMessage),
  memories: many(chatMemory),
}));

export const chatParticipantRelations = relations(chatParticipant, ({ one, many }) => ({
  thread: one(chatThread, {
    fields: [chatParticipant.threadId],
    references: [chatThread.id],
  }),
  messages: many(chatMessage),
}));

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
  thread: one(chatThread, {
    fields: [chatMessage.threadId],
    references: [chatThread.id],
  }),
  participant: one(chatParticipant, {
    fields: [chatMessage.participantId],
    references: [chatParticipant.id],
  }),
  parentMessage: one(chatMessage, {
    fields: [chatMessage.parentMessageId],
    references: [chatMessage.id],
    relationName: 'messageThread',
  }),
}));

export const chatMemoryRelations = relations(chatMemory, ({ one }) => ({
  user: one(user, {
    fields: [chatMemory.userId],
    references: [user.id],
  }),
  thread: one(chatThread, {
    fields: [chatMemory.threadId],
    references: [chatThread.id],
  }),
}));
