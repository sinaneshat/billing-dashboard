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
import { createHandler, createHandlerWithTransaction, Responses } from '@/api/core';
import { ZarinPalService } from '@/api/services/zarinpal';
import type { ApiEnv } from '@/api/types';
import { getDbAsync } from '@/db';
import { billingEvent, payment, product, subscription } from '@/db/tables/billing';

import type {
  getPaymentsRoute,
  paymentCallbackRoute,
} from './route';
import {
  PaymentCallbackRequestSchema,
} from './schema';

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

/**
 * GET /payments/callback - Handle ZarinPal payment callback
 * Refactored: Uses factory pattern + direct database access + transaction
 */
export const paymentCallbackHandler: RouteHandler<typeof paymentCallbackRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'public', // Callback comes from ZarinPal, not user
    validateQuery: PaymentCallbackRequestSchema,
    operationName: 'paymentCallback',
  },
  async (c, tx) => {
    const { Authority, Status } = c.validated.query;
    const db = await getDbAsync();

    c.logger.info('Processing payment callback', { logType: 'operation', operationName: 'paymentCallback', resource: Authority });

    // Find payment using direct DB access
    const paymentResults = await db.select().from(payment).where(eq(payment.zarinpalAuthority, Authority)).limit(1);
    const paymentRecord = paymentResults[0];

    if (!paymentRecord) {
      c.logger.warn('Payment not found for callback', { logType: 'operation', operationName: 'paymentCallback', resource: Authority });
      throw createError.notFound('Payment');
    }

    c.logger.info('Found payment for callback', {
      logType: 'operation',
      operationName: 'paymentCallback',
      userId: paymentRecord.userId,
      resource: paymentRecord.id,
    });

    // Handle failed payment
    if (Status === 'NOK') {
      c.logger.warn('Payment canceled by user', { logType: 'operation', operationName: 'paymentCallback', resource: paymentRecord.id });

      await tx.update(payment)
        .set({
          status: 'failed',
          failureReason: 'Payment canceled by user',
          failedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentRecord.id));

      // Log billing event using direct DB access
      await tx.insert(billingEvent).values({
        id: crypto.randomUUID(),
        userId: paymentRecord.userId,
        subscriptionId: paymentRecord.subscriptionId,
        paymentId: paymentRecord.id,
        paymentMethodId: null,
        eventType: 'payment_cancelled',
        eventData: {
          amount: paymentRecord.amount,
          cancelledBy: 'user',
          authority: Authority,
        },
        severity: 'warning',
        createdAt: new Date(),
      });

      return Responses.ok(c, {
        success: false,
        paymentId: paymentRecord.id,
        subscriptionId: paymentRecord.subscriptionId,
      });
    }

    // Verify payment with ZarinPal
    const zarinPal = ZarinPalService.create();
    const verification = await zarinPal.verifyPayment({
      authority: Authority,
      amount: paymentRecord.amount,
    });

    const isSuccessful = verification.data?.code === 100 || verification.data?.code === 101;

    if (isSuccessful) {
      c.logger.info('Payment verification successful', {
        logType: 'operation',
        operationName: 'paymentCallback',
        resource: paymentRecord.id,
      });

      // Update payment status using direct DB access
      await tx.update(payment)
        .set({
          status: 'completed',
          zarinpalRefId: verification.data?.ref_id?.toString(),
          zarinpalCardHash: verification.data?.card_hash,
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentRecord.id));

      // Handle subscription activation if needed
      if (paymentRecord.subscriptionId) {
        const [subscriptionResults, productResults] = await Promise.all([
          db.select().from(subscription).where(eq(subscription.id, paymentRecord.subscriptionId)).limit(1),
          db.select().from(product).where(eq(product.id, paymentRecord.productId)).limit(1),
        ]);

        const subscriptionRecord = subscriptionResults[0];
        const productRecord = productResults[0];

        if (subscriptionRecord && productRecord && subscriptionRecord.status === 'pending') {
          const startDate = new Date();
          const nextBillingDate = productRecord.billingPeriod === 'monthly'
            ? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
            : null;

          await tx.update(subscription)
            .set({
              status: 'active',
              startDate,
              nextBillingDate,
              currentPrice: productRecord.price,
              updatedAt: new Date(),
            })
            .where(eq(subscription.id, paymentRecord.subscriptionId));

          c.logger.info('Subscription activated', {
            logType: 'operation',
            operationName: 'activateSubscription',
            resource: paymentRecord.subscriptionId!,
          });
        }
      }

      // Note: Roundtable integration was removed as part of cleanup

      // Log successful payment event using direct DB access
      await tx.insert(billingEvent).values({
        id: crypto.randomUUID(),
        userId: paymentRecord.userId,
        subscriptionId: paymentRecord.subscriptionId,
        paymentId: paymentRecord.id,
        paymentMethodId: null,
        eventType: 'payment_completed',
        eventData: {
          amount: paymentRecord.amount,
          refId: verification.data?.ref_id?.toString(),
          authority: Authority,
          paymentType: 'zarinpal_standard',
        },
        severity: 'info',
        createdAt: new Date(),
      });

      // Extract referrer from payment metadata for redirect back to roundtable
      const paymentMetadata = paymentRecord.metadata as { referrer?: string } | null;
      const referrerUrl = paymentMetadata?.referrer;

      return Responses.ok(c, {
        success: true,
        paymentId: paymentRecord.id,
        subscriptionId: paymentRecord.subscriptionId,
        refId: verification.data?.ref_id?.toString(),
        ...(referrerUrl && { redirectUrl: referrerUrl }),
      });
    } else {
      c.logger.warn('Payment verification failed', {
        logType: 'operation',
        operationName: 'paymentCallback',
        resource: paymentRecord.id,
      });

      // Update payment as failed using direct DB access
      await tx.update(payment)
        .set({
          status: 'failed',
          failureReason: `ZarinPal verification failed: ${verification.data?.message}`,
          failedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentRecord.id));

      // Log failed payment event using direct DB access
      await tx.insert(billingEvent).values({
        id: crypto.randomUUID(),
        userId: paymentRecord.userId,
        subscriptionId: paymentRecord.subscriptionId,
        paymentId: paymentRecord.id,
        paymentMethodId: null,
        eventType: 'payment_failed',
        eventData: {
          amount: paymentRecord.amount,
          failureReason: verification.data?.message || 'Unknown error',
          zarinpalCode: verification.data?.code,
          authority: Authority,
        },
        severity: 'error',
        createdAt: new Date(),
      });

      return Responses.ok(c, {
        success: false,
        paymentId: paymentRecord.id,
        subscriptionId: paymentRecord.subscriptionId,
      });
    }
  },
);
