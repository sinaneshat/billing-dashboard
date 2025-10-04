import type { RouteHandler } from '@hono/zod-openapi';

import { createError } from '@/api/common/error-handling';
import type { ErrorContext } from '@/api/core';
import { createHandler, Responses } from '@/api/core';
import {
  checkMessageQuota,
  checkThreadQuota,
  getUserUsageStats,
} from '@/api/services/usage-tracking.service';
import type { ApiEnv } from '@/api/types';

import type {
  checkMessageQuotaRoute,
  checkThreadQuotaRoute,
  getUserUsageStatsRoute,
} from './route';

// ============================================================================
// Helper Functions
// ============================================================================

function createAuthErrorContext(operation?: string): ErrorContext {
  return {
    errorType: 'authentication',
    operation: operation || 'session_required',
  };
}

// ============================================================================
// Usage Statistics Handlers
// ============================================================================

/**
 * Get user usage statistics
 * Returns comprehensive usage data for UI display
 */
export const getUserUsageStatsHandler: RouteHandler<
  typeof getUserUsageStatsRoute,
  ApiEnv
> = createHandler(
  {
    auth: 'session',
    operationName: 'getUserUsageStats',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    const stats = await getUserUsageStats(user.id);

    return Responses.ok(c, stats);
  },
);

/**
 * Check thread creation quota
 * Used by UI to show whether "Create Thread" button should be enabled
 */
export const checkThreadQuotaHandler: RouteHandler<
  typeof checkThreadQuotaRoute,
  ApiEnv
> = createHandler(
  {
    auth: 'session',
    operationName: 'checkThreadQuota',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    const quota = await checkThreadQuota(user.id);

    return Responses.ok(c, quota);
  },
);

/**
 * Check message creation quota
 * Used by UI to show whether "Send Message" button should be enabled
 */
export const checkMessageQuotaHandler: RouteHandler<
  typeof checkMessageQuotaRoute,
  ApiEnv
> = createHandler(
  {
    auth: 'session',
    operationName: 'checkMessageQuota',
  },
  async (c) => {
    const user = c.var.user;
    if (!user) {
      throw createError.unauthenticated('Authentication required', createAuthErrorContext());
    }

    const quota = await checkMessageQuota(user.id);

    return Responses.ok(c, quota);
  },
);
