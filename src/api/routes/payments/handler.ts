import type { RouteHandler } from '@hono/zod-openapi';
import { and, desc, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { ok } from '@/api/common/responses';
import { ZarinPalService } from '@/api/services/zarinpal';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { billingEvent, payment, product, subscription } from '@/db/tables/billing';
import { logError } from '@/lib/utils/safe-logger';

import type {
  generateInvoiceRoute,
  getPaymentsRoute,
  paymentCallbackRoute,
  verifyPaymentRoute,
} from './route';

// Legacy card detection function removed - this platform uses direct debit contracts only

// Legacy card detection and payment method creation functions removed
// Payment methods are now created exclusively through direct debit contract setup

/**
 * Handler for GET /payments
 * Returns all payments for the authenticated user
 */
export const getPaymentsHandler: RouteHandler<typeof getPaymentsRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'payments');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  try {
    const paymentsData = await db
      .select()
      .from(payment)
      .innerJoin(product, eq(payment.productId, product.id))
      .leftJoin(subscription, eq(payment.subscriptionId, subscription.id))
      .where(eq(payment.userId, user.id))
      .orderBy(desc(payment.createdAt));

    // ✅ Return complete drizzle schema data with joined data
    const paymentsWithDetails = paymentsData.map(row => ({
      ...row.payment,
      product: {
        id: row.product.id,
        name: row.product.name,
        description: row.product.description,
      },
      subscription: row.subscription
        ? {
            id: row.subscription.id,
            status: row.subscription.status,
          }
        : null,
    }));

    return ok(c, paymentsWithDetails);
  } catch (error) {
    logError('Failed to fetch payments', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to fetch payments',
    });
  }
};

/**
 * Handler for GET /payments/callback
 * Processes payment callback from ZarinPal
 */
export const paymentCallbackHandler: RouteHandler<typeof paymentCallbackRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'payment-callback');

  const { Authority, Status } = c.req.valid('query');

  try {
    // Find payment by ZarinPal authority
    const paymentData = await db
      .select()
      .from(payment)
      .leftJoin(subscription, eq(payment.subscriptionId, subscription.id))
      .innerJoin(product, eq(payment.productId, product.id))
      .where(eq(payment.zarinpalAuthority, Authority))
      .limit(1);

    if (!paymentData.length) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: 'Payment not found',
      });
    }

    const paymentRecord = paymentData[0]!.payment;
    const subscriptionRecord = paymentData[0]!.subscription;
    const productRecord = paymentData[0]!.product;

    // Handle failed payment
    if (Status === 'NOK') {
      await db
        .update(payment)
        .set({
          status: 'failed',
          failureReason: 'Payment canceled by user',
          failedAt: new Date(),
        })
        .where(eq(payment.id, paymentRecord.id));

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
      // ✅ CRITICAL FIX: Wrap all related database operations in a single transaction
      // This ensures atomicity - either all operations succeed or all fail
      await db.transaction(async (tx) => {
        // Update payment record - direct debit contracts don't create payment methods here
        await tx
          .update(payment)
          .set({
            status: 'completed',
            zarinpalRefId: verification.data?.ref_id?.toString(),
            zarinpalCardHash: verification.data?.card_hash,
            paidAt: new Date(),
          })
          .where(eq(payment.id, paymentRecord.id));

        // Update subscription if this is for a subscription (legacy one-time payment)
        if (subscriptionRecord && paymentRecord.subscriptionId) {
          const startDate = new Date();
          const nextBillingDate = productRecord.billingPeriod === 'monthly'
            ? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
            : null;

          await tx
            .update(subscription)
            .set({
              status: 'active',
              startDate,
              nextBillingDate,
              currentPrice: productRecord.price,
              // Note: Legacy one-time payments don't create direct debit contracts
            })
            .where(eq(subscription.id, subscriptionRecord.id));
        }

        // Log successful payment event
        await tx.insert(billingEvent).values({
          userId: paymentRecord.userId,
          subscriptionId: paymentRecord.subscriptionId,
          paymentId: paymentRecord.id,
          paymentMethodId: null, // No payment method created for legacy payments
          eventType: 'payment_completed',
          eventData: {
            amount: paymentRecord.amount,
            refId: verification.data?.ref_id?.toString(),
            productName: productRecord.name,
            paymentType: 'zarinpal_oneoff_legacy',
          },
          severity: 'info',
        });
      });

      return ok(c, {
        success: true,
        paymentId: paymentRecord.id,
        subscriptionId: paymentRecord.subscriptionId,
        refId: verification.data?.ref_id?.toString(),
      });
    } else {
      // ✅ CRITICAL FIX: Wrap failed payment operations in transaction for atomicity
      await db.transaction(async (tx) => {
        // Payment verification failed
        await tx
          .update(payment)
          .set({
            status: 'failed',
            failureReason: `ZarinPal verification failed: ${verification.data?.message || 'Unknown error'}`,
            failedAt: new Date(),
          })
          .where(eq(payment.id, paymentRecord.id));

        // Log failed payment event
        await tx.insert(billingEvent).values({
          userId: paymentRecord.userId,
          subscriptionId: paymentRecord.subscriptionId,
          paymentId: paymentRecord.id,
          eventType: 'payment_failed',
          eventData: {
            amount: paymentRecord.amount,
            failureReason: verification.data?.message || 'Unknown error',
            productName: productRecord.name,
            zarinpalCode: verification.data?.code,
          },
          severity: 'error',
        });
      });

      return ok(c, {
        success: false,
        paymentId: paymentRecord.id,
        subscriptionId: paymentRecord.subscriptionId,
      });
    }
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    logError('Payment callback processing failed', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to process payment callback',
    });
  }
};

/**
 * Handler for POST /payments/verify
 * Manually verify a payment (for debugging/recovery)
 */
export const verifyPaymentHandler: RouteHandler<typeof verifyPaymentRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'verify-payment');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  const { authority } = c.req.valid('json');

  try {
    // Find payment by authority and user
    const paymentData = await db
      .select()
      .from(payment)
      .where(
        and(
          eq(payment.zarinpalAuthority, authority),
          eq(payment.userId, user.id),
        ),
      )
      .limit(1);

    if (!paymentData.length) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: 'Payment not found',
      });
    }

    const paymentRecord = paymentData[0]!;

    // Verify with ZarinPal
    const zarinPal = ZarinPalService.create(c.env);
    const verification = await zarinPal.verifyPayment({
      authority,
      amount: paymentRecord.amount,
    });

    const isSuccessful = verification.data?.code === 100 || verification.data?.code === 101;

    if (isSuccessful && paymentRecord.status !== 'completed') {
      // ✅ CRITICAL FIX: Wrap all payment verification updates in a single transaction
      await db.transaction(async (tx) => {
        // Update payment status
        await tx
          .update(payment)
          .set({
            status: 'completed',
            zarinpalRefId: verification.data?.ref_id?.toString(),
            zarinpalCardHash: verification.data?.card_hash,
            paidAt: new Date(),
          })
          .where(eq(payment.id, paymentRecord.id));

        // Update subscription if exists and not already active
        if (paymentRecord.subscriptionId) {
          const subscriptionData = await tx
            .select()
            .from(subscription)
            .where(eq(subscription.id, paymentRecord.subscriptionId))
            .limit(1);

          if (subscriptionData.length && subscriptionData[0]!.status === 'pending') {
            const startDate = new Date();
            const productData = await tx
              .select()
              .from(product)
              .where(eq(product.id, paymentRecord.productId))
              .limit(1);

            const nextBillingDate = productData.length && productData[0]!.billingPeriod === 'monthly'
              ? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
              : null;

            await tx
              .update(subscription)
              .set({
                status: 'active',
                startDate,
                nextBillingDate,
                directDebitContractId: verification.data?.card_hash,
              })
              .where(eq(subscription.id, paymentRecord.subscriptionId));
          }
        }
      });
    }

    return ok(c, {
      verified: isSuccessful,
      paymentId: paymentRecord.id,
      refId: verification.data?.ref_id?.toString(),
      cardHash: verification.data?.card_hash,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    logError('Payment verification failed', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to verify payment',
    });
  }
};

/**
 * Handler for POST /payments/{id}/invoice
 * Generate a downloadable invoice for a payment
 */
export const generateInvoiceHandler: RouteHandler<typeof generateInvoiceRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'generate-invoice');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  const { id: paymentId } = c.req.valid('param');
  const { format, language } = c.req.valid('json');

  try {
    // Fetch payment with related data
    const paymentData = await db
      .select()
      .from(payment)
      .leftJoin(product, eq(payment.productId, product.id))
      .leftJoin(subscription, eq(payment.subscriptionId, subscription.id))
      .where(
        and(
          eq(payment.id, paymentId),
          eq(payment.userId, user.id),
        ),
      )
      .limit(1);

    if (!paymentData.length) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: 'Payment not found',
      });
    }

    const paymentRecord = paymentData[0]!;

    // Only generate invoices for completed payments
    if (paymentRecord.payment.status !== 'completed') {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Invoice can only be generated for completed payments',
      });
    }

    // Generate unique invoice ID
    const invoiceId = `INV-${paymentId.slice(-8).toUpperCase()}-${Date.now()}`;

    // Invoice content generation would happen here in production
    // For now, we just return metadata about the invoice

    // In a production system, you would:
    // 1. Save the invoice content to cloud storage (S3, GCS, etc.)
    // 2. Generate a signed URL for download
    // 3. Set appropriate expiration time

    // For this example, we'll return the content directly
    const downloadUrl = `/api/v1/payments/${paymentId}/download/${invoiceId}`;

    return c.json({
      success: true,
      data: {
        invoiceId,
        downloadUrl,
        format,
        language,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      },
    }, HttpStatusCodes.CREATED);
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    logError('Invoice generation failed', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to generate invoice',
    });
  }
};
