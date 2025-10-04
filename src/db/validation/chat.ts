import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';

import {
  chatMemory,
  chatMessage,
  chatParticipant,
  chatThread,
  modelConfiguration,
} from '@/db/tables/chat';

/**
 * Chat Thread Schemas
 */
export const chatThreadSelectSchema = createSelectSchema(chatThread);
export const chatThreadInsertSchema = createInsertSchema(chatThread, {
  title: schema => schema.min(1).max(200),
  mode: () => z.enum(['analyzing', 'brainstorming', 'debating', 'solving']),
});
export const chatThreadUpdateSchema = createUpdateSchema(chatThread, {
  title: schema => schema.min(1).max(200).optional(),
  mode: () => z.enum(['analyzing', 'brainstorming', 'debating', 'solving']).optional(),
});

/**
 * Chat Participant Schemas
 */
export const chatParticipantSelectSchema = createSelectSchema(chatParticipant);
export const chatParticipantInsertSchema = createInsertSchema(chatParticipant, {
  modelId: schema => schema.min(1),
  role: schema => schema.min(1).max(100),
  priority: schema => schema.min(0).max(100),
});
export const chatParticipantUpdateSchema = createUpdateSchema(chatParticipant, {
  role: schema => schema.min(1).max(100).optional(),
  priority: schema => schema.min(0).max(100).optional(),
});

/**
 * Chat Message Schemas
 */
export const chatMessageSelectSchema = createSelectSchema(chatMessage);
export const chatMessageInsertSchema = createInsertSchema(chatMessage, {
  content: schema => schema.min(1),
  role: () => z.enum(['user', 'assistant']),
});
export const chatMessageUpdateSchema = createUpdateSchema(chatMessage, {
  content: schema => schema.min(1).optional(),
});

/**
 * Chat Memory Schemas
 */
export const chatMemorySelectSchema = createSelectSchema(chatMemory);
export const chatMemoryInsertSchema = createInsertSchema(chatMemory, {
  title: schema => schema.min(1).max(200),
  content: schema => schema.min(1),
  type: () => z.enum(['personal', 'topic', 'instruction', 'fact']),
});
export const chatMemoryUpdateSchema = createUpdateSchema(chatMemory, {
  title: schema => schema.min(1).max(200).optional(),
  content: schema => schema.min(1).optional(),
});

/**
 * Model Configuration Schemas
 */
export const modelConfigurationSelectSchema = createSelectSchema(modelConfiguration);
export const modelConfigurationInsertSchema = createInsertSchema(modelConfiguration, {
  modelId: schema => schema.min(1),
  name: schema => schema.min(1).max(100),
  provider: () => z.enum(['openrouter', 'anthropic', 'openai', 'google', 'xai', 'perplexity']),
});
export const modelConfigurationUpdateSchema = createUpdateSchema(modelConfiguration, {
  name: schema => schema.min(1).max(100).optional(),
});

/**
 * Type exports
 */
export type ChatThread = z.infer<typeof chatThreadSelectSchema>;
export type ChatThreadInsert = z.infer<typeof chatThreadInsertSchema>;
export type ChatThreadUpdate = z.infer<typeof chatThreadUpdateSchema>;

export type ChatParticipant = z.infer<typeof chatParticipantSelectSchema>;
export type ChatParticipantInsert = z.infer<typeof chatParticipantInsertSchema>;
export type ChatParticipantUpdate = z.infer<typeof chatParticipantUpdateSchema>;

export type ChatMessage = z.infer<typeof chatMessageSelectSchema>;
export type ChatMessageInsert = z.infer<typeof chatMessageInsertSchema>;
export type ChatMessageUpdate = z.infer<typeof chatMessageUpdateSchema>;

export type ChatMemory = z.infer<typeof chatMemorySelectSchema>;
export type ChatMemoryInsert = z.infer<typeof chatMemoryInsertSchema>;
export type ChatMemoryUpdate = z.infer<typeof chatMemoryUpdateSchema>;

export type ModelConfiguration = z.infer<typeof modelConfigurationSelectSchema>;
export type ModelConfigurationInsert = z.infer<typeof modelConfigurationInsertSchema>;
export type ModelConfigurationUpdate = z.infer<typeof modelConfigurationUpdateSchema>;
