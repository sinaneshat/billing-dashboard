import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { SUBSCRIPTION_TIERS } from '@/db/validation/usage';

import { user } from './auth';

/**
 * User Chat Usage Tracking
 * Tracks cumulative usage of chat features per user per billing period
 * Does NOT decrement when users delete threads/messages (usage is permanent)
 */
export const userChatUsage = sqliteTable(
  'user_chat_usage',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Current billing period tracking
    currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }).notNull(),
    currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }).notNull(),

    // Thread/Conversation usage (cumulative - never decremented)
    threadsCreated: integer('threads_created').notNull().default(0),
    threadsLimit: integer('threads_limit').notNull(), // From subscription tier

    // Message usage (cumulative - never decremented)
    messagesCreated: integer('messages_created').notNull().default(0),
    messagesLimit: integer('messages_limit').notNull(), // From subscription tier

    // Subscription tier metadata
    subscriptionTier: text('subscription_tier', {
      enum: SUBSCRIPTION_TIERS,
    })
      .notNull()
      .default('free'),
    isAnnual: integer('is_annual', { mode: 'boolean' }).notNull().default(false),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    index('user_chat_usage_user_idx').on(table.userId),
    index('user_chat_usage_period_idx').on(table.currentPeriodEnd),
  ],
);

/**
 * User Chat Usage History
 * Historical record of usage for each billing period
 * Used for analytics and tracking usage over time
 */
export const userChatUsageHistory = sqliteTable(
  'user_chat_usage_history',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Period tracking
    periodStart: integer('period_start', { mode: 'timestamp' }).notNull(),
    periodEnd: integer('period_end', { mode: 'timestamp' }).notNull(),

    // Usage stats for this period
    threadsCreated: integer('threads_created').notNull().default(0),
    threadsLimit: integer('threads_limit').notNull(),
    messagesCreated: integer('messages_created').notNull().default(0),
    messagesLimit: integer('messages_limit').notNull(),

    // Subscription info at time of period
    subscriptionTier: text('subscription_tier', {
      enum: SUBSCRIPTION_TIERS,
    }).notNull(),
    isAnnual: integer('is_annual', { mode: 'boolean' }).notNull().default(false),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  table => [
    index('user_chat_usage_history_user_idx').on(table.userId),
    index('user_chat_usage_history_period_idx').on(table.periodStart, table.periodEnd),
  ],
);

/**
 * Subscription Tier Quotas Configuration
 * Defines the limits for each subscription tier
 * Can be updated without code changes
 */
export const subscriptionTierQuotas = sqliteTable(
  'subscription_tier_quotas',
  {
    id: text('id').primaryKey(),

    // Tier identification
    tier: text('tier', {
      enum: SUBSCRIPTION_TIERS,
    })
      .notNull(),
    isAnnual: integer('is_annual', { mode: 'boolean' }).notNull().default(false),

    // Chat quotas
    threadsPerMonth: integer('threads_per_month').notNull(),
    messagesPerMonth: integer('messages_per_month').notNull(),
    maxAiModels: integer('max_ai_models').notNull().default(5),

    // Feature flags
    allowCustomRoles: integer('allow_custom_roles', { mode: 'boolean' })
      .notNull()
      .default(false),
    allowMemories: integer('allow_memories', { mode: 'boolean' }).notNull().default(false),
    allowThreadExport: integer('allow_thread_export', { mode: 'boolean' })
      .notNull()
      .default(false),

    // Metadata
    metadata: text('metadata', { mode: 'json' }).$type<{
      description?: string;
      displayOrder?: number;
      [key: string]: unknown;
    }>(),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    index('subscription_tier_quotas_tier_idx').on(table.tier),
    index('subscription_tier_quotas_annual_idx').on(table.isAnnual),
    index('subscription_tier_quotas_tier_annual_unique_idx').on(table.tier, table.isAnnual),
  ],
);

// ============================================================================
// Relations
// ============================================================================

export const userChatUsageRelations = relations(userChatUsage, ({ one }) => ({
  user: one(user, {
    fields: [userChatUsage.userId],
    references: [user.id],
  }),
}));

export const userChatUsageHistoryRelations = relations(userChatUsageHistory, ({ one }) => ({
  user: one(user, {
    fields: [userChatUsageHistory.userId],
    references: [user.id],
  }),
}));
