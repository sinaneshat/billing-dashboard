/**
 * Usage Tracking Service
 *
 * Handles chat quota tracking and enforcement for subscription tiers
 * Key features:
 * - Tracks thread and message creation (cumulative, never decremented)
 * - Enforces limits based on subscription tier
 * - Handles billing period rollover
 * - Provides usage statistics for UI display
 */

import { and, eq } from 'drizzle-orm';
import { ulid } from 'ulid';

import { createError } from '@/api/common/error-handling';
import type { ErrorContext } from '@/api/core';
import { apiLogger } from '@/api/middleware/hono-logger';
import { getDbAsync } from '@/db';
import * as tables from '@/db/schema';
import type {
  QuotaCheck,
  UsageStats,
} from '@/db/validation/usage';

/**
 * Subscription tier type
 */
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';

/**
 * Get or create user usage record
 * Ensures a user has a usage tracking record for the current billing period
 */
async function ensureUserUsageRecord(userId: string): Promise<typeof tables.userChatUsage.$inferSelect> {
  const db = await getDbAsync();

  // Check if user has existing usage record
  let usage = await db.query.userChatUsage.findFirst({
    where: eq(tables.userChatUsage.userId, userId),
  });

  const now = new Date();

  // If no usage record exists, create one with free tier defaults
  if (!usage) {
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // Last day of current month

    const [newUsage] = await db
      .insert(tables.userChatUsage)
      .values({
        id: ulid(),
        userId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        threadsCreated: 0,
        threadsLimit: 2, // Free tier default
        messagesCreated: 0,
        messagesLimit: 20, // Free tier default
        subscriptionTier: 'free',
        isAnnual: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    usage = newUsage;
    apiLogger.info('Created new usage record for user', { userId, tier: 'free' });
  }

  // At this point, usage is guaranteed to be defined
  if (!usage) {
    const context: ErrorContext = {
      errorType: 'database',
      operation: 'select',
      table: 'user_chat_usage',
      userId,
    };
    throw createError.internal('Usage record unexpectedly undefined', context);
  }

  // Check if billing period has expired
  if (usage.currentPeriodEnd < now) {
    await rolloverBillingPeriod(userId, usage);

    // Fetch the updated usage record
    const updatedUsage = await db.query.userChatUsage.findFirst({
      where: eq(tables.userChatUsage.userId, userId),
    });

    if (!updatedUsage) {
      const context: ErrorContext = {
        errorType: 'database',
        operation: 'select',
        table: 'user_chat_usage',
        userId,
      };
      throw createError.internal('Failed to fetch updated usage record after rollover', context);
    }

    usage = updatedUsage;
  }

  return usage;
}

/**
 * Rollover billing period
 * Archives current usage and resets counters for new period
 */
async function rolloverBillingPeriod(
  userId: string,
  currentUsage: typeof tables.userChatUsage.$inferSelect,
): Promise<void> {
  const db = await getDbAsync();
  const now = new Date();

  // Archive current usage to history
  await db.insert(tables.userChatUsageHistory).values({
    id: ulid(),
    userId,
    periodStart: currentUsage.currentPeriodStart,
    periodEnd: currentUsage.currentPeriodEnd,
    threadsCreated: currentUsage.threadsCreated,
    threadsLimit: currentUsage.threadsLimit,
    messagesCreated: currentUsage.messagesCreated,
    messagesLimit: currentUsage.messagesLimit,
    subscriptionTier: currentUsage.subscriptionTier,
    isAnnual: currentUsage.isAnnual,
    createdAt: now,
  });

  // Calculate new period
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Reset usage counters for new period
  await db
    .update(tables.userChatUsage)
    .set({
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      threadsCreated: 0,
      messagesCreated: 0,
      updatedAt: now,
    })
    .where(eq(tables.userChatUsage.userId, userId));

  apiLogger.info('Rolled over billing period for user', {
    userId,
    oldPeriod: { start: currentUsage.currentPeriodStart, end: currentUsage.currentPeriodEnd },
    newPeriod: { start: periodStart, end: periodEnd },
  });
}

/**
 * Check thread creation quota
 * Returns whether user can create a new thread and current usage stats
 */
export async function checkThreadQuota(userId: string): Promise<QuotaCheck> {
  const usage = await ensureUserUsageRecord(userId);

  const canCreate = usage.threadsCreated < usage.threadsLimit;
  const remaining = Math.max(0, usage.threadsLimit - usage.threadsCreated);

  return {
    canCreate,
    current: usage.threadsCreated,
    limit: usage.threadsLimit,
    remaining,
    resetDate: usage.currentPeriodEnd,
    tier: usage.subscriptionTier,
  };
}

/**
 * Check message creation quota
 * Returns whether user can send a new message and current usage stats
 */
export async function checkMessageQuota(userId: string): Promise<QuotaCheck> {
  const usage = await ensureUserUsageRecord(userId);

  const canCreate = usage.messagesCreated < usage.messagesLimit;
  const remaining = Math.max(0, usage.messagesLimit - usage.messagesCreated);

  return {
    canCreate,
    current: usage.messagesCreated,
    limit: usage.messagesLimit,
    remaining,
    resetDate: usage.currentPeriodEnd,
    tier: usage.subscriptionTier,
  };
}

/**
 * Increment thread creation counter
 * Must be called AFTER successfully creating a thread
 * Does NOT decrement when threads are deleted
 */
export async function incrementThreadUsage(userId: string): Promise<void> {
  const db = await getDbAsync();
  const usage = await ensureUserUsageRecord(userId);

  await db
    .update(tables.userChatUsage)
    .set({
      threadsCreated: usage.threadsCreated + 1,
      updatedAt: new Date(),
    })
    .where(eq(tables.userChatUsage.userId, userId));

  apiLogger.info('Incremented thread usage for user', {
    userId,
    newCount: usage.threadsCreated + 1,
    limit: usage.threadsLimit,
  });
}

/**
 * Increment message creation counter
 * Must be called AFTER successfully creating a message
 * Does NOT decrement when messages are deleted
 */
export async function incrementMessageUsage(userId: string, count = 1): Promise<void> {
  const db = await getDbAsync();
  const usage = await ensureUserUsageRecord(userId);

  await db
    .update(tables.userChatUsage)
    .set({
      messagesCreated: usage.messagesCreated + count,
      updatedAt: new Date(),
    })
    .where(eq(tables.userChatUsage.userId, userId));

  apiLogger.info('Incremented message usage for user', {
    userId,
    count,
    newCount: usage.messagesCreated + count,
    limit: usage.messagesLimit,
  });
}

/**
 * Get comprehensive usage statistics for a user
 * Used for displaying usage in the UI
 */
export async function getUserUsageStats(userId: string): Promise<UsageStats> {
  const usage = await ensureUserUsageRecord(userId);
  const now = new Date();

  const threadsRemaining = Math.max(0, usage.threadsLimit - usage.threadsCreated);
  const messagesRemaining = Math.max(0, usage.messagesLimit - usage.messagesCreated);

  const threadsPercentage = usage.threadsLimit > 0
    ? Math.round((usage.threadsCreated / usage.threadsLimit) * 100)
    : 0;

  const messagesPercentage = usage.messagesLimit > 0
    ? Math.round((usage.messagesCreated / usage.messagesLimit) * 100)
    : 0;

  const daysRemaining = Math.ceil(
    (usage.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    threads: {
      used: usage.threadsCreated,
      limit: usage.threadsLimit,
      remaining: threadsRemaining,
      percentage: threadsPercentage,
    },
    messages: {
      used: usage.messagesCreated,
      limit: usage.messagesLimit,
      remaining: messagesRemaining,
      percentage: messagesPercentage,
    },
    period: {
      start: usage.currentPeriodStart,
      end: usage.currentPeriodEnd,
      daysRemaining,
    },
    subscription: {
      tier: usage.subscriptionTier,
      isAnnual: usage.isAnnual,
    },
  };
}

/**
 * Update user subscription tier and quotas
 * Called when user subscribes, upgrades, or downgrades
 */
export async function updateUserSubscriptionTier(
  userId: string,
  tier: SubscriptionTier,
  isAnnual: boolean,
): Promise<void> {
  const db = await getDbAsync();

  // Get quota config for this tier
  const quotaConfig = await db.query.subscriptionTierQuotas.findFirst({
    where: and(
      eq(tables.subscriptionTierQuotas.tier, tier),
      eq(tables.subscriptionTierQuotas.isAnnual, isAnnual),
    ),
  });

  if (!quotaConfig) {
    const context: ErrorContext = {
      errorType: 'resource',
      resource: 'subscription_tier_quotas',
      resourceId: `${tier}-${isAnnual ? 'annual' : 'monthly'}`,
    };
    throw createError.notFound(`Quota configuration not found for tier: ${tier}`, context);
  }

  // Ensure usage record exists
  await ensureUserUsageRecord(userId);

  // Update subscription tier and limits
  await db
    .update(tables.userChatUsage)
    .set({
      subscriptionTier: tier,
      isAnnual,
      threadsLimit: quotaConfig.threadsPerMonth,
      messagesLimit: quotaConfig.messagesPerMonth,
      updatedAt: new Date(),
    })
    .where(eq(tables.userChatUsage.userId, userId));

  apiLogger.info('Updated user subscription tier', {
    userId,
    tier,
    isAnnual,
    newLimits: {
      threads: quotaConfig.threadsPerMonth,
      messages: quotaConfig.messagesPerMonth,
    },
  });
}

/**
 * Enforce thread quota before creation
 * Throws error if user has exceeded quota
 */
export async function enforceThreadQuota(userId: string): Promise<void> {
  const quota = await checkThreadQuota(userId);

  if (!quota.canCreate) {
    const context: ErrorContext = {
      errorType: 'resource',
      resource: 'chat_thread',
      userId,
    };
    throw createError.badRequest(
      `Thread creation limit reached. You have used ${quota.current} of ${quota.limit} threads this month. Upgrade your plan for more threads.`,
      context,
    );
  }
}

/**
 * Enforce message quota before creation
 * Throws error if user has exceeded quota
 */
export async function enforceMessageQuota(userId: string): Promise<void> {
  const quota = await checkMessageQuota(userId);

  if (!quota.canCreate) {
    const context: ErrorContext = {
      errorType: 'resource',
      resource: 'chat_message',
      userId,
    };
    throw createError.badRequest(
      `Message creation limit reached. You have used ${quota.current} of ${quota.limit} messages this month. Upgrade your plan for more messages.`,
      context,
    );
  }
}
