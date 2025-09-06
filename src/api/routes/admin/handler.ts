/**
 * Admin API Handlers - Platform Owner Access
 * Using factory pattern for consistent authentication, error handling, and repository access
 */

import type { RouteHandler } from '@hono/zod-openapi';
import { desc, like } from 'drizzle-orm';

import { createHandler, Responses } from '@/api/core';
import { billingRepositories } from '@/api/repositories/billing-repositories';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { user } from '@/db/schema';

import type {
  adminStatsRoute,
  adminTestWebhookRoute,
  adminUsersRoute,
} from './route';
import {
  AdminUsersQuerySchema,
  AdminWebhookTestRequestSchema,
} from './schema';

// =============================================================================
// Admin Handlers using existing patterns
// =============================================================================

export const adminStatsHandler: RouteHandler<typeof adminStatsRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'getAdminStats',
  },
  async (c) => {
    c.logger.info('Fetching admin statistics', {
      logType: 'operation',
      operationName: 'getAdminStats',
    });

    // Use repository pattern for data access with proper type safety
    const [users, subscriptionsResult, paymentsResult] = await Promise.all([
      db.select().from(user),
      billingRepositories.subscriptions.findMany(),
      billingRepositories.payments.findMany(),
    ]);

    const subscriptions = subscriptionsResult.items;
    const payments = paymentsResult.items;

    // Enhanced type safety with proper filtering
    const stats = {
      users: {
        total: users.length,
        verified: users.filter(u => Boolean(u.emailVerified)).length,
      },
      subscriptions: {
        total: subscriptions.length,
        active: subscriptions.filter(s => s.status === 'active').length,
        canceled: subscriptions.filter(s => s.status === 'canceled').length,
      },
      payments: {
        total: payments.length,
        successful: payments.filter(p => p.status === 'completed').length,
        totalAmount: payments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + p.amount, 0),
        currency: 'IRR' as const,
      },
    } as const;

    c.logger.info('Admin statistics retrieved successfully', {
      logType: 'operation',
      operationName: 'getAdminStats',
      resource: `stats[users:${stats.users.total},subs:${stats.subscriptions.total},payments:${stats.payments.total}]`,
    });

    return Responses.ok(c, stats);
  },
);

export const adminUsersHandler: RouteHandler<typeof adminUsersRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    validateQuery: AdminUsersQuerySchema,
    operationName: 'getAdminUsers',
  },
  async (c) => {
    const { page, limit, search } = c.validated.query;
    const offset = (page - 1) * limit;

    c.logger.info('Fetching admin users list', {
      logType: 'operation',
      operationName: 'getAdminUsers',
      resource: `page:${page},limit:${limit}${search ? `,search:${search}` : ''}`,
    });

    try {
      // Build search condition if provided
      const searchCondition = search ? like(user.email, `%${search}%`) : undefined;

      // Get users with pagination and proper type safety
      const [userData, totalCount] = await Promise.all([
        // Get paginated results
        db.select()
          .from(user)
          .where(searchCondition)
          .orderBy(desc(user.createdAt))
          .limit(limit)
          .offset(offset),

        // Get total count for pagination (more efficient than selecting all)
        db.select()
          .from(user)
          .where(searchCondition)
          .then(results => results.length),
      ]);

      // Transform data with proper type safety
      const transformedData = userData.map(u => ({
        id: u.id,
        name: u.name ?? '',
        email: u.email,
        emailVerified: Boolean(u.emailVerified),
        createdAt: u.createdAt.toISOString(),
      }));

      const responseData = {
        data: transformedData,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      };

      c.logger.info('Admin users retrieved successfully', {
        logType: 'operation',
        operationName: 'getAdminUsers',
        resource: `users[${transformedData.length}]`,
      });

      return Responses.ok(c, responseData);
    } catch (error) {
      c.logger.error('Failed to fetch admin users', error as Error, {
        logType: 'operation',
        operationName: 'getAdminUsers',
        resource: 'users',
      });
      throw error;
    }
  },
);

export const adminTestWebhookHandler: RouteHandler<typeof adminTestWebhookRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    validateBody: AdminWebhookTestRequestSchema,
    operationName: 'adminTestWebhook',
  },
  async (c) => {
    const { event_type, test_data } = c.validated.body;
    const webhookUrl = c.env?.EXTERNAL_WEBHOOK_URL;

    c.logger.info('Admin webhook test requested', {
      logType: 'operation',
      operationName: 'adminTestWebhook',
      resource: webhookUrl || 'none',
    });

    if (!webhookUrl) {
      c.logger.warn('External webhook URL not configured', {
        logType: 'operation',
        operationName: 'adminTestWebhook',
        resource: 'config',
      });

      const responseData = {
        success: false,
        message: 'External webhook URL not configured. Set EXTERNAL_WEBHOOK_URL environment variable.',
        webhook_url: undefined,
      } as const;

      return Responses.ok(c, responseData);
    }

    try {
      // Build test event with proper type safety
      const testEvent = {
        id: `test_${Date.now()}`,
        type: event_type,
        created: Math.floor(Date.now() / 1000),
        data: test_data ?? {
          test: true,
          timestamp: new Date().toISOString(),
          message: 'Test webhook from admin panel',
          source: 'admin-test',
        },
        livemode: c.env?.NODE_ENV === 'production',
      } as const;

      c.logger.info('Sending test webhook', {
        logType: 'operation',
        operationName: 'adminTestWebhook',
        resource: `${event_type}@${webhookUrl}`,
      });

      // Send webhook with timeout and proper error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DeadPixel-Admin-Test/1.0',
          'X-Admin-Test': 'true',
        },
        body: JSON.stringify(testEvent),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const success = response.ok;
      const statusText = response.statusText || 'Unknown';

      const responseData = {
        success,
        message: success
          ? `Test webhook sent successfully to ${webhookUrl}`
          : `Failed to send webhook: ${response.status} ${statusText}`,
        webhook_url: webhookUrl,
      } as const;

      c.logger.info('Test webhook completed', {
        logType: 'operation',
        operationName: 'adminTestWebhook',
        resource: `${response.status}:${statusText}`,
      });

      return Responses.ok(c, responseData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      c.logger.error('Test webhook failed', error as Error, {
        logType: 'operation',
        operationName: 'adminTestWebhook',
        resource: webhookUrl,
      });

      const responseData = {
        success: false,
        message: `Failed to send webhook: ${errorMessage}`,
        webhook_url: webhookUrl,
      } as const;

      return Responses.ok(c, responseData);
    }
  },
);
