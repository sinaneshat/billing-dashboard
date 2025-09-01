/**
 * Admin API Handlers - Platform Owner Access
 * Leverages existing database queries and webhook infrastructure
 */

import type { RouteHandler } from '@hono/zod-openapi';
import { desc, like } from 'drizzle-orm';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { ok } from '@/api/common/responses';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { payment, subscription, user } from '@/db/schema';

import type {
  adminStatsRoute,
  adminTestWebhookRoute,
  adminUsersRoute,
} from './route';

// =============================================================================
// Admin Handlers using existing patterns
// =============================================================================

export const adminStatsHandler: RouteHandler<typeof adminStatsRoute, ApiEnv> = async (c) => {
  try {
    // Use existing database queries - no need to duplicate logic
    const [users, subscriptions, payments] = await Promise.all([
      db.select().from(user),
      db.select().from(subscription),
      db.select().from(payment),
    ]);

    const stats = {
      users: {
        total: users.length,
        verified: users.filter(u => u.emailVerified).length,
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
    };

    return ok(c, stats);
  } catch (error) {
    console.error('Admin stats error:', error);
    return c.json({ code: HttpStatusCodes.INTERNAL_SERVER_ERROR, message: 'Failed to fetch platform statistics' }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const adminUsersHandler: RouteHandler<typeof adminUsersRoute, ApiEnv> = async (c) => {
  try {
    const { page, limit, search } = c.req.valid('query');
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

    return ok(c, {
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
  } catch (error) {
    console.error('Admin users error:', error);
    return c.json({ code: HttpStatusCodes.INTERNAL_SERVER_ERROR, message: 'Failed to fetch users' }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const adminTestWebhookHandler: RouteHandler<typeof adminTestWebhookRoute, ApiEnv> = async (c) => {
  try {
    const { event_type, test_data } = c.req.valid('json');
    const webhookUrl = c.env?.EXTERNAL_WEBHOOK_URL;

    if (!webhookUrl) {
      const responseData = {
        success: false,
        message: 'External webhook URL not configured. Set EXTERNAL_WEBHOOK_URL environment variable.',
        webhook_url: undefined,
      };
      return ok(c, responseData);
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

    return ok(c, {
      success,
      message: success
        ? `Test webhook sent successfully to ${webhookUrl}`
        : `Failed to send webhook: ${response.status} ${response.statusText}`,
      webhook_url: webhookUrl,
    });
  } catch (error) {
    console.error('Admin test webhook error:', error);
    return c.json(
      { code: HttpStatusCodes.INTERNAL_SERVER_ERROR, message: 'Failed to send test webhook' },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};
