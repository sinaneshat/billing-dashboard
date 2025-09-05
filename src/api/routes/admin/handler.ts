/**
 * Admin API Handlers - Platform Owner Access
 * Using factory pattern for consistent authentication, error handling, and repository access
 */

import type { RouteHandler } from '@hono/zod-openapi';
import { desc, like } from 'drizzle-orm';
import type { z } from 'zod';

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
    // Use repository pattern for data access
    const [users, subscriptionsResult, paymentsResult] = await Promise.all([
      db.select().from(user),
      billingRepositories.subscriptions.findMany(),
      billingRepositories.payments.findMany(),
    ]);

    const subscriptions = subscriptionsResult.items;
    const payments = paymentsResult.items;

    const stats = {
      users: {
        total: users.length,
        verified: users.filter((u: typeof users[0]) => u.emailVerified).length,
      },
      subscriptions: {
        total: subscriptions.length,
        active: subscriptions.filter((s: typeof subscriptions[0]) => s.status === 'active').length,
        canceled: subscriptions.filter((s: typeof subscriptions[0]) => s.status === 'canceled').length,
      },
      payments: {
        total: payments.length,
        successful: payments.filter((p: typeof payments[0]) => p.status === 'completed').length,
        totalAmount: payments
          .filter((p: typeof payments[0]) => p.status === 'completed')
          .reduce((sum: number, p: typeof payments[0]) => sum + p.amount, 0),
        currency: 'IRR' as const,
      },
    };

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
    const { page, limit, search } = c.validated.query as z.infer<typeof AdminUsersQuerySchema>;
    const offset = (page - 1) * limit;

    // Simplified query approach to avoid TypeScript complex type issues
    const userData = search
      ? await db.select().from(user).where(like(user.email, `%${search}%`)).orderBy(desc(user.createdAt)).limit(limit).offset(offset)
      : await db.select().from(user).orderBy(desc(user.createdAt)).limit(limit).offset(offset);

    // Get total count for pagination
    const allUsers = search
      ? await db.select().from(user).where(like(user.email, `%${search}%`))
      : await db.select().from(user);

    const totalUsers = allUsers.length;

    return Responses.ok(c, {
      data: userData.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit),
      },
    });
  },
);

export const adminTestWebhookHandler: RouteHandler<typeof adminTestWebhookRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    validateBody: AdminWebhookTestRequestSchema,
    operationName: 'adminTestWebhook',
  },
  async (c) => {
    const { event_type, test_data } = c.validated.body as z.infer<typeof AdminWebhookTestRequestSchema>;
    const webhookUrl = c.env?.EXTERNAL_WEBHOOK_URL;

    if (!webhookUrl) {
      const responseData = {
        success: false,
        message: 'External webhook URL not configured. Set EXTERNAL_WEBHOOK_URL environment variable.',
        webhook_url: undefined,
      };
      return Responses.ok(c, responseData);
    }

    // Use existing webhook infrastructure - leverage the database webhook event system
    const testEvent = {
      id: `test_${Date.now()}`,
      type: event_type,
      created: Math.floor(Date.now() / 1000),
      data: test_data || {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Test webhook from admin panel',
      },
      livemode: c.env?.NODE_ENV === 'production',
    };

    // Send webhook using existing fetch pattern from webhook handler
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DeadPixel-Admin-Test/1.0',
      },
      body: JSON.stringify(testEvent),
    });

    const success = response.ok;

    return Responses.ok(c, {
      success,
      message: success
        ? `Test webhook sent successfully to ${webhookUrl}`
        : `Failed to send webhook: ${response.status} ${response.statusText}`,
      webhook_url: webhookUrl,
    });
  },
);
