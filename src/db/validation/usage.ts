import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import {
  subscriptionTierQuotas,
  userChatUsage,
  userChatUsageHistory,
} from '../tables/usage';

// ============================================================================
// Subscription Tier Schema - Single Source of Truth
// ============================================================================

/**
 * Subscription Tier Tuple - Const assertion for type safety
 * Used by Drizzle ORM for database enum columns and Zod validation
 *
 * Supported Tiers:
 * - free: Free tier with basic limits
 * - starter: Entry-level paid tier ($20/mo or $200/yr)
 * - pro: Professional tier ($59/mo or $600/yr) - MOST POPULAR
 * - power: High-volume tier ($249/mo or $2500/yr)
 */
export const SUBSCRIPTION_TIERS = ['free', 'starter', 'pro', 'power'] as const;

/**
 * Subscription Tier Type - TypeScript Type
 * Inferred from the const tuple to ensure type safety
 */
export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[number];

/**
 * Subscription Tier Enum - Zod Schema
 * Use this for validation in API routes, database schemas, and forms
 */
export const subscriptionTierSchema = z.enum(SUBSCRIPTION_TIERS);

/**
 * Subscription Tier Display Names
 * Human-readable names for each tier
 */
export const SUBSCRIPTION_TIER_NAMES: Record<SubscriptionTier, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  power: 'Power',
} as const;

/**
 * Helper function to validate if a string is a valid subscription tier
 */
export function isValidSubscriptionTier(tier: unknown): tier is SubscriptionTier {
  return subscriptionTierSchema.safeParse(tier).success;
}

/**
 * Helper function to get tier display name
 */
export function getSubscriptionTierName(tier: SubscriptionTier): string {
  return SUBSCRIPTION_TIER_NAMES[tier];
}

// ============================================================================
// User Chat Usage Schemas
// ============================================================================

export const userChatUsageSelectSchema = createSelectSchema(userChatUsage);
export const userChatUsageInsertSchema = createInsertSchema(userChatUsage, {
  threadsCreated: schema => schema.min(0),
  threadsLimit: schema => schema.min(0),
  messagesCreated: schema => schema.min(0),
  messagesLimit: schema => schema.min(0),
  subscriptionTier: () => subscriptionTierSchema,
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
  subscriptionTier: () => subscriptionTierSchema,
  isAnnual: () => z.boolean(),
});

export type UserChatUsageHistory = z.infer<typeof userChatUsageHistorySelectSchema>;
export type UserChatUsageHistoryInsert = z.infer<typeof userChatUsageHistoryInsertSchema>;

// ============================================================================
// Subscription Tier Quotas Schemas
// ============================================================================

export const subscriptionTierQuotasSelectSchema = createSelectSchema(subscriptionTierQuotas);
export const subscriptionTierQuotasInsertSchema = createInsertSchema(subscriptionTierQuotas, {
  tier: () => subscriptionTierSchema,
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
  tier: subscriptionTierSchema,
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
    tier: subscriptionTierSchema,
    isAnnual: z.boolean(),
  }),
});

export type UsageStats = z.infer<typeof usageStatsSchema>;
