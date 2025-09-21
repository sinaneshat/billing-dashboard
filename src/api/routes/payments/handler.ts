/**
 * Payments Route Handlers - Refactored
 *
 * Uses the factory pattern for consistent authentication, validation,
 * transaction management, and error handling. Leverages the repository
 * pattern for clean data access.
 */

import type { RouteHandler } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';

import { createError } from '@/api/common/error-handling';
import { createHandler, Responses } from '@/api/core';
import type { ApiEnv } from '@/api/types';
import { getDbAsync } from '@/db';
import { payment, product, subscription } from '@/db/tables/billing';

import type {
  getPaymentsRoute,
} from './route';

// ============================================================================
// PAYMENT HANDLERS
// ============================================================================

/**
 * GET /payments - Get user payment history
 * Refactored: Uses factory pattern + direct database access
 */
export const getPaymentsHandler: RouteHandler<typeof getPaymentsRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'getPayments',
  },
  async (c) => {
    const user = c.get('user');
    const db = await getDbAsync();

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }
    c.logger.info('Fetching payments for user', { logType: 'operation', operationName: 'getPayments', userId: user.id });

    // Direct database access for payments
    const payments = await db.select().from(payment).where(eq(payment.userId, user.id));

    // Transform to match response schema with related data
    const paymentsWithDetails = await Promise.all(
      payments.map(async (payment) => {
        const [productResult, subscriptionResult] = await Promise.all([
          db.select().from(product).where(eq(product.id, payment.productId)).limit(1),
          payment.subscriptionId
            ? db.select().from(subscription).where(eq(subscription.id, payment.subscriptionId)).limit(1)
            : null,
        ]);

        const productRecord = productResult[0];
        const subscriptionRecord = subscriptionResult?.[0];

        return {
          ...payment,
          product: productRecord
            ? {
                id: productRecord.id,
                name: productRecord.name,
                description: productRecord.description,
              }
            : null,
          subscription: subscriptionRecord
            ? {
                id: subscriptionRecord.id,
                status: subscriptionRecord.status,
              }
            : null,
        };
      }),
    );

    c.logger.info('Payments retrieved successfully', {
      logType: 'operation',
      operationName: 'getPayments',
      resource: `payments[${paymentsWithDetails.length}]`,
    });

    return Responses.ok(c, paymentsWithDetails);
  },
);
