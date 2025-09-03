/**
 * Payments Route Handlers - Refactored
 *
 * Uses the factory pattern for consistent authentication, validation,
 * transaction management, and error handling. Leverages the repository
 * pattern for clean data access.
 */

import type { RouteHandler } from '@hono/zod-openapi';
import type { z } from 'zod';

import { createError } from '@/api/common/error-handling';
import { created, ok } from '@/api/common/responses';
import { createHandler, createHandlerWithTransaction } from '@/api/patterns/route-handler-factory';
import { billingRepositories } from '@/api/repositories/billing-repositories';
import { ZarinPalService } from '@/api/services/zarinpal';
import type { ApiEnv } from '@/api/types';

import type {
  generateInvoiceRoute,
  getPaymentsRoute,
  paymentCallbackRoute,
  verifyPaymentRoute,
} from './route';
import {
  GenerateInvoiceRequestSchema,
  PaymentCallbackRequestSchema,
  PaymentParamsSchema,
  VerifyPaymentRequestSchema,
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
    c.logger.info('Fetching payments for user', { userId: user.id });

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
      count: paymentsWithDetails.length,
    });

    return ok(c, paymentsWithDetails);
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
    const { Authority, Status } = c.validated.query as z.infer<typeof PaymentCallbackRequestSchema>;

    c.logger.info('Processing payment callback', { Authority, Status });

    // Find payment using repository
    const paymentRecord = await billingRepositories.payments.findByZarinpalAuthority(Authority);

    if (!paymentRecord) {
      c.logger.warn('Payment not found for callback', { Authority });
      throw createError.notFound('Payment');
    }

    c.logger.info('Found payment for callback', {
      paymentId: paymentRecord.id,
      userId: paymentRecord.userId,
    });

    // Handle failed payment
    if (Status === 'NOK') {
      c.logger.warn('Payment canceled by user', { paymentId: paymentRecord.id });

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

      return ok(c, {
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
        paymentId: paymentRecord.id,
        refId: verification.data?.ref_id,
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
            subscriptionId: paymentRecord.subscriptionId,
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

      return ok(c, {
        success: true,
        paymentId: paymentRecord.id,
        subscriptionId: paymentRecord.subscriptionId,
        refId: verification.data?.ref_id?.toString(),
      });
    } else {
      c.logger.warn('Payment verification failed', {
        paymentId: paymentRecord.id,
        code: verification.data?.code,
        message: verification.data?.message,
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

      return ok(c, {
        success: false,
        paymentId: paymentRecord.id,
        subscriptionId: paymentRecord.subscriptionId,
      });
    }
  },
);

/**
 * POST /payments/verify - Manually verify a payment
 * ✅ Refactored: Uses factory pattern + repositories + transaction
 */
export const verifyPaymentHandler: RouteHandler<typeof verifyPaymentRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'session',
    validateBody: VerifyPaymentRequestSchema,
    operationName: 'verifyPayment',
  },
  async (c, tx) => {
    const user = c.get('user')!;
    const { authority } = c.validated.body as z.infer<typeof VerifyPaymentRequestSchema>;

    c.logger.info('Manual payment verification requested', {
      userId: user.id,
      authority,
    });

    // Find payment by authority and user
    const paymentRecord = await billingRepositories.payments.findByZarinpalAuthority(authority);

    if (!paymentRecord || paymentRecord.userId !== user.id) {
      c.logger.warn('Payment not found for verification', { authority, userId: user.id });
      throw createError.notFound('Payment');
    }

    // Verify with ZarinPal
    const zarinPal = ZarinPalService.create(c.env);
    const verification = await zarinPal.verifyPayment({
      authority,
      amount: paymentRecord.amount,
    });

    const isSuccessful = verification.data?.code === 100 || verification.data?.code === 101;

    if (isSuccessful && paymentRecord.status !== 'completed') {
      c.logger.info('Manual verification successful, updating payment', {
        paymentId: paymentRecord.id,
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

      // Activate subscription if pending
      if (paymentRecord.subscriptionId) {
        const subscription = await billingRepositories.subscriptions.findById(
          paymentRecord.subscriptionId,
        );

        if (subscription && subscription.status === 'pending') {
          const product = await billingRepositories.products.findById(paymentRecord.productId);

          if (product) {
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
                directDebitContractId: verification.data?.card_hash,
              },
              { tx },
            );

            c.logger.info('Subscription activated via manual verification', {
              subscriptionId: paymentRecord.subscriptionId,
            });
          }
        }
      }

      // Log manual verification event
      await billingRepositories.billingEvents.logEvent({
        userId: user.id,
        subscriptionId: paymentRecord.subscriptionId,
        paymentId: paymentRecord.id,
        paymentMethodId: null,
        eventType: 'payment_manually_verified',
        eventData: {
          amount: paymentRecord.amount,
          refId: verification.data?.ref_id?.toString(),
          verifiedBy: user.id,
        },
        severity: 'info',
      }, tx);
    }

    return ok(c, {
      verified: isSuccessful,
      paymentId: paymentRecord.id,
      refId: verification.data?.ref_id?.toString(),
      cardHash: verification.data?.card_hash,
    });
  },
);

/**
 * POST /payments/{id}/invoice - Generate payment invoice
 * ✅ Refactored: Uses factory pattern + repositories
 */
export const generateInvoiceHandler: RouteHandler<typeof generateInvoiceRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    validateParams: PaymentParamsSchema,
    validateBody: GenerateInvoiceRequestSchema,
    operationName: 'generateInvoice',
  },
  async (c) => {
    const user = c.get('user')!;
    const { id: paymentId } = c.validated.params as z.infer<typeof PaymentParamsSchema>;
    const { format, language, includeDetails } = c.validated.body as z.infer<typeof GenerateInvoiceRequestSchema>;

    c.logger.info('Invoice generation requested', {
      paymentId,
      format,
      language,
      userId: user.id,
    });

    // Find payment with validation
    const paymentRecord = await billingRepositories.payments.findById(paymentId);

    if (!paymentRecord || paymentRecord.userId !== user.id) {
      c.logger.warn('Payment not found for invoice generation', { paymentId, userId: user.id });
      throw createError.notFound('Payment');
    }

    if (paymentRecord.status !== 'completed') {
      c.logger.warn('Invoice requested for non-completed payment', {
        paymentId,
        status: paymentRecord.status,
      });
      throw createError.internal('Invoice can only be generated for completed payments');
    }

    // Generate invoice metadata
    const invoiceId = `INV-${paymentId.slice(-8).toUpperCase()}-${Date.now()}`;
    const downloadUrl = `/api/v1/payments/${paymentId}/download/${invoiceId}`;

    c.logger.info('Invoice metadata generated', {
      invoiceId,
      downloadUrl,
    });

    // Log invoice generation event
    await billingRepositories.billingEvents.logEvent({
      userId: user.id,
      subscriptionId: paymentRecord.subscriptionId,
      paymentId: paymentRecord.id,
      paymentMethodId: null,
      eventType: 'invoice_generated',
      eventData: {
        invoiceId,
        format,
        language,
        includeDetails,
      },
      severity: 'info',
    });

    return created(c, {
      invoiceId,
      downloadUrl,
      format,
      language,
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    });
  },
);
