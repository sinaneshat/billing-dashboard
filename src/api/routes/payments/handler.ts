/**
 * Payments Route Handlers - Refactored
 *
 * Uses the factory pattern for consistent authentication, validation,
 * transaction management, and error handling. Leverages the repository
 * pattern for clean data access.
 */

import type { RouteHandler } from '@hono/zod-openapi';

import { createError } from '@/api/common/error-handling';
import { createHandler, createHandlerWithTransaction, Responses } from '@/api/core';
import { billingRepositories } from '@/api/repositories/billing-repositories';
import { ZarinPalService } from '@/api/services/zarinpal';
import type { ApiEnv } from '@/api/types';

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
 * ✅ Refactored: Uses factory pattern + repositories
 */
export const getPaymentsHandler: RouteHandler<typeof getPaymentsRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'getPayments',
  },
  async (c) => {
    const user = c.get('user')!; // Guaranteed by auth: 'session'
    c.logger.info('Fetching payments for user', { logType: 'operation', operationName: 'getPayments', userId: user.id });

    // Use repository instead of direct DB query
    const payments = await billingRepositories.payments.findPaymentsByUserId(user.id);

    // Transform to match response schema with related data
    const paymentsWithDetails = await Promise.all(
      payments.map(async (payment) => {
        const [product, subscription] = await Promise.all([
          billingRepositories.products.findById(payment.productId),
          payment.subscriptionId
            ? billingRepositories.subscriptions.findById(payment.subscriptionId)
            : null,
        ]);

        return {
          ...payment,
          product: product
            ? {
                id: product.id,
                name: product.name,
                description: product.description,
              }
            : null,
          subscription: subscription
            ? {
                id: subscription.id,
                status: subscription.status,
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
 * ✅ Refactored: Uses factory pattern + repositories + transaction
 */
export const paymentCallbackHandler: RouteHandler<typeof paymentCallbackRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'public', // Callback comes from ZarinPal, not user
    validateQuery: PaymentCallbackRequestSchema,
    operationName: 'paymentCallback',
  },
  async (c, tx) => {
    const { Authority, Status } = c.validated.query;

    c.logger.info('Processing payment callback', { logType: 'operation', operationName: 'paymentCallback', resource: Authority });

    // Find payment using repository
    const paymentRecord = await billingRepositories.payments.findByZarinpalAuthority(Authority);

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

      await billingRepositories.payments.updateStatus(
        paymentRecord.id,
        'failed',
        { failureReason: 'Payment canceled by user' },
        tx,
      );

      // Log billing event
      await billingRepositories.billingEvents.logEvent({
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
      }, tx);

      return Responses.ok(c, {
        success: false,
        paymentId: paymentRecord.id,
        subscriptionId: paymentRecord.subscriptionId,
      });
    }

    // Verify payment with ZarinPal
    const zarinPal = ZarinPalService.create(c.env);
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

      // Update payment status
      await billingRepositories.payments.updateStatus(
        paymentRecord.id,
        'completed',
        {
          zarinpalRefId: verification.data?.ref_id?.toString(),
          zarinpalCardHash: verification.data?.card_hash,
        },
        tx,
      );

      // Handle subscription activation if needed
      if (paymentRecord.subscriptionId) {
        const subscription = await billingRepositories.subscriptions.findById(
          paymentRecord.subscriptionId,
        );
        const product = await billingRepositories.products.findById(paymentRecord.productId);

        if (subscription && product && subscription.status === 'pending') {
          const startDate = new Date();
          const nextBillingDate = product.billingPeriod === 'monthly'
            ? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
            : null;

          await billingRepositories.subscriptions.update(
            paymentRecord.subscriptionId,
            {
              status: 'active',
              startDate,
              nextBillingDate,
              currentPrice: product.price,
            },
            { tx },
          );

          c.logger.info('Subscription activated', {
            logType: 'operation',
            operationName: 'activateSubscription',
            resource: paymentRecord.subscriptionId!,
          });
        }
      }

      // Log successful payment event
      await billingRepositories.billingEvents.logEvent({
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
      }, tx);

      return Responses.ok(c, {
        success: true,
        paymentId: paymentRecord.id,
        subscriptionId: paymentRecord.subscriptionId,
        refId: verification.data?.ref_id?.toString(),
      });
    } else {
      c.logger.warn('Payment verification failed', {
        logType: 'operation',
        operationName: 'paymentCallback',
        resource: paymentRecord.id,
      });

      // Update payment as failed
      await billingRepositories.payments.updateStatus(
        paymentRecord.id,
        'failed',
        { failureReason: `ZarinPal verification failed: ${verification.data?.message}` },
        tx,
      );

      // Log failed payment event
      await billingRepositories.billingEvents.logEvent({
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
      }, tx);

      return Responses.ok(c, {
        success: false,
        paymentId: paymentRecord.id,
        subscriptionId: paymentRecord.subscriptionId,
      });
    }
  },
);
