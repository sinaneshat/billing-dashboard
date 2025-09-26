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
import { payment } from '@/db/tables/billing';

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

    // SOLID-compliant database access - ONLY payment domain data
    // Following Single Responsibility Principle: no cross-domain data fetching
    const payments = await db.select().from(payment).where(eq(payment.userId, user.id));

    // Return RAW database data - NO transformations
    // Frontend handles all currency conversion and formatting

    c.logger.info('Payments retrieved successfully', {
      logType: 'operation',
      operationName: 'getPayments',
      resource: `payments[${payments.length}]`,
    });

    return Responses.ok(c, payments);
  },
);
