import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import {
  subscriptionTierQuotas,
  userChatUsage,
  userChatUsageHistory,
} from '../tables/usage';

// ============================================================================
// User Chat Usage Schemas
// ============================================================================

export const userChatUsageSelectSchema = createSelectSchema(userChatUsage);
export const userChatUsageInsertSchema = createInsertSchema(userChatUsage, {
  threadsCreated: schema => schema.min(0),
  threadsLimit: schema => schema.min(0),
  messagesCreated: schema => schema.min(0),
  messagesLimit: schema => schema.min(0),
  subscriptionTier: () =>
    z.enum(['free', 'starter', 'pro', 'enterprise']),
  isAnnual: () => z.boolean(),
});

export type UserChatUsage = z.infer<typeof userChatUsageSelectSchema>;
export type UserChatUsageInsert = z.infer<typeof userChatUsageInsertSchema>;

// ============================================================================
// User Chat Usage History Schemas
// ============================================================================

export const userChatUsageHistorySelectSchema = createSelectSchema(userChatUsageHistory);
export const userChatUsageHistoryInsertSchema = createInsertSchema(userChatUsageHistory, {
  threadsCreated: schema => schema.min(0),
  threadsLimit: schema => schema.min(0),
  messagesCreated: schema => schema.min(0),
  messagesLimit: schema => schema.min(0),
  subscriptionTier: () =>
    z.enum(['free', 'starter', 'pro', 'enterprise']),
  isAnnual: () => z.boolean(),
});

export type UserChatUsageHistory = z.infer<typeof userChatUsageHistorySelectSchema>;
export type UserChatUsageHistoryInsert = z.infer<typeof userChatUsageHistoryInsertSchema>;

// ============================================================================
// Subscription Tier Quotas Schemas
// ============================================================================

export const subscriptionTierQuotasSelectSchema = createSelectSchema(subscriptionTierQuotas);
export const subscriptionTierQuotasInsertSchema = createInsertSchema(subscriptionTierQuotas, {
  tier: () => z.enum(['free', 'starter', 'pro', 'enterprise']),
  isAnnual: () => z.boolean(),
  threadsPerMonth: schema => schema.min(0),
  messagesPerMonth: schema => schema.min(0),
  maxAiModels: schema => schema.min(1).max(50),
  allowCustomRoles: () => z.boolean(),
  allowMemories: () => z.boolean(),
  allowThreadExport: () => z.boolean(),
});

export type SubscriptionTierQuotas = z.infer<typeof subscriptionTierQuotasSelectSchema>;
export type SubscriptionTierQuotasInsert = z.infer<typeof subscriptionTierQuotasInsertSchema>;

// ============================================================================
// Helper Schemas for Usage Tracking
// ============================================================================

/**
 * Schema for quota check response
 */
export const quotaCheckSchema = z.object({
  canCreate: z.boolean(),
  current: z.number(),
  limit: z.number(),
  remaining: z.number(),
  resetDate: z.date(),
  tier: z.enum(['free', 'starter', 'pro', 'enterprise']),
});

export type QuotaCheck = z.infer<typeof quotaCheckSchema>;

/**
 * Schema for usage statistics response
 */
export const usageStatsSchema = z.object({
  threads: z.object({
    used: z.number(),
    limit: z.number(),
    remaining: z.number(),
    percentage: z.number(),
  }),
  messages: z.object({
    used: z.number(),
    limit: z.number(),
    remaining: z.number(),
    percentage: z.number(),
  }),
  period: z.object({
    start: z.date(),
    end: z.date(),
    daysRemaining: z.number(),
  }),
  subscription: z.object({
    tier: z.enum(['free', 'starter', 'pro', 'enterprise']),
    isAnnual: z.boolean(),
  }),
});

export type UsageStats = z.infer<typeof usageStatsSchema>;
