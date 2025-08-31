import type { RouteHandler } from '@hono/zod-openapi';
import { and, desc, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { ok } from '@/api/common/responses';
import { ZarinPalService } from '@/api/services/zarinpal';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { billingEvent, payment, paymentMethod, product, subscription } from '@/db/tables/billing';

import type {
  getPaymentsRoute,
  paymentCallbackRoute,
  verifyPaymentRoute,
} from './route';

/**
 * Helper function to extract card information from ZarinPal card PAN
 */
function extractCardInfo(cardPan?: string): { cardMask: string; cardType: string | null } {
  if (!cardPan || cardPan.length < 6) {
    return { cardMask: '**** **** **** ****', cardType: null };
  }

  // Create masked card number
  const cardMask = `**** **** **** ${cardPan.slice(-4)}`;

  // Determine card type based on first digits (Iranian banks)
  let cardType: string | null = null;
  const firstDigits = cardPan.slice(0, 6);

  // Iranian bank card prefixes (common ones)
  if (firstDigits.startsWith('627760') || firstDigits.startsWith('627412')) {
    cardType = 'IRAN_KISH';
  } else if (firstDigits.startsWith('627648') || firstDigits.startsWith('627593')) {
    cardType = 'PARSIAN';
  } else if (firstDigits.startsWith('627381') || firstDigits.startsWith('505785')) {
    cardType = 'ANSAR';
  } else if (firstDigits.startsWith('627353') || firstDigits.startsWith('622106')) {
    cardType = 'TEJARAT';
  } else if (firstDigits.startsWith('627760')) {
    cardType = 'POST_BANK';
  } else if (firstDigits.startsWith('627412')) {
    cardType = 'EGHTESAD_NOVIN';
  } else if (firstDigits.startsWith('4')) {
    cardType = 'VISA';
  } else if (firstDigits.startsWith('5')) {
    cardType = 'MASTERCARD';
  } else {
    cardType = 'UNKNOWN';
  }

  return { cardMask, cardType };
}

/**
 * Helper function to save or update payment method
 */
async function savePaymentMethod(
  userId: string,
  cardHash: string,
  cardPan?: string,
): Promise<string | null> {
  try {
    // Check if payment method already exists
    const existingMethod = await db
      .select()
      .from(paymentMethod)
      .where(and(
        eq(paymentMethod.userId, userId),
        eq(paymentMethod.zarinpalCardHash, cardHash),
      ))
      .limit(1);

    if (existingMethod.length > 0) {
      // Update last used timestamp
      await db
        .update(paymentMethod)
        .set({ lastUsedAt: new Date() })
        .where(eq(paymentMethod.id, existingMethod[0]!.id));

      return existingMethod[0]!.id;
    }

    // Check if user has any payment methods (to determine if this should be primary)
    const userMethods = await db
      .select()
      .from(paymentMethod)
      .where(eq(paymentMethod.userId, userId))
      .limit(1);

    const isFirstMethod = userMethods.length === 0;
    const { cardMask, cardType } = extractCardInfo(cardPan);

    // Create new payment method
    const newMethodId = crypto.randomUUID();
    await db.insert(paymentMethod).values({
      id: newMethodId,
      userId,
      zarinpalCardHash: cardHash,
      cardMask,
      cardType,
      isPrimary: isFirstMethod, // First card becomes primary
      isActive: true,
      lastUsedAt: new Date(),
    });

    // Log billing event
    await db.insert(billingEvent).values({
      userId,
      paymentMethodId: newMethodId,
      eventType: 'payment_method_created',
      eventData: {
        cardMask,
        cardType,
        isPrimary: isFirstMethod,
        source: 'payment_completion',
      },
      severity: 'info',
    });

    return newMethodId;
  } catch (error) {
    console.error('Failed to save payment method:', error);
    return null;
  }
}

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

    const transformedPayments = paymentsData.map(row => ({
      id: row.payment.id,
      userId: row.payment.userId,
      subscriptionId: row.payment.subscriptionId,
      productId: row.payment.productId,
      amount: row.payment.amount,
      currency: row.payment.currency,
      status: row.payment.status,
      paymentMethod: row.payment.paymentMethod,
      zarinpalAuthority: row.payment.zarinpalAuthority,
      zarinpalRefId: row.payment.zarinpalRefId,
      paidAt: row.payment.paidAt?.toISOString() ?? null,
      createdAt: row.payment.createdAt.toISOString(),
      updatedAt: row.payment.updatedAt.toISOString(),
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

    return ok(c, transformedPayments);
  } catch (error) {
    console.error('Failed to fetch payments:', error);
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

    // Verify payment with ZarinPal using factory pattern
    const zarinPal = ZarinPalService.fromEnv(c.env);
    const verification = await zarinPal.verifyPayment({
      authority: Authority,
      amount: paymentRecord.amount,
    });

    const isSuccessful = verification.data?.code === 100 || verification.data?.code === 101;

    if (isSuccessful) {
      // Save payment method if card_hash is available
      let paymentMethodId: string | null = null;
      if (verification.data?.card_hash) {
        paymentMethodId = await savePaymentMethod(
          paymentRecord.userId,
          verification.data.card_hash,
          verification.data?.card_pan,
        );
      }

      // Update payment record
      await db
        .update(payment)
        .set({
          status: 'completed',
          zarinpalRefId: verification.data?.ref_id?.toString(),
          zarinpalCardHash: verification.data?.card_hash,
          paidAt: new Date(),
        })
        .where(eq(payment.id, paymentRecord.id));

      // Update subscription if this is for a subscription
      if (subscriptionRecord && paymentRecord.subscriptionId) {
        const startDate = new Date();
        const nextBillingDate = productRecord.billingPeriod === 'monthly'
          ? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
          : null;

        await db
          .update(subscription)
          .set({
            status: 'active',
            startDate,
            nextBillingDate,
            currentPrice: productRecord.price, // Update to current product price
            zarinpalDirectDebitToken: verification.data?.card_hash, // Store for future direct debit
            paymentMethodId, // Link to payment method
          })
          .where(eq(subscription.id, subscriptionRecord.id));
      }

      // Log successful payment event
      await db.insert(billingEvent).values({
        userId: paymentRecord.userId,
        subscriptionId: paymentRecord.subscriptionId,
        paymentId: paymentRecord.id,
        paymentMethodId,
        eventType: 'payment_completed',
        eventData: {
          amount: paymentRecord.amount,
          refId: verification.data?.ref_id?.toString(),
          productName: productRecord.name,
          cardHash: verification.data?.card_hash,
        },
        severity: 'info',
      });

      return ok(c, {
        success: true,
        paymentId: paymentRecord.id,
        subscriptionId: paymentRecord.subscriptionId,
        refId: verification.data?.ref_id?.toString(),
      });
    } else {
      // Payment verification failed
      await db
        .update(payment)
        .set({
          status: 'failed',
          failureReason: `ZarinPal verification failed: ${verification.data?.message || 'Unknown error'}`,
          failedAt: new Date(),
        })
        .where(eq(payment.id, paymentRecord.id));

      // Log failed payment event
      await db.insert(billingEvent).values({
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
    console.error('Payment callback processing failed:', error);
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

    // Verify with ZarinPal using factory pattern
    const zarinPal = ZarinPalService.fromEnv(c.env);
    const verification = await zarinPal.verifyPayment({
      authority,
      amount: paymentRecord.amount,
    });

    const isSuccessful = verification.data?.code === 100 || verification.data?.code === 101;

    if (isSuccessful && paymentRecord.status !== 'completed') {
      // Update payment status
      await db
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
        const subscriptionData = await db
          .select()
          .from(subscription)
          .where(eq(subscription.id, paymentRecord.subscriptionId))
          .limit(1);

        if (subscriptionData.length && subscriptionData[0]!.status === 'pending') {
          const startDate = new Date();
          const productData = await db
            .select()
            .from(product)
            .where(eq(product.id, paymentRecord.productId))
            .limit(1);

          const nextBillingDate = productData.length && productData[0]!.billingPeriod === 'monthly'
            ? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
            : null;

          await db
            .update(subscription)
            .set({
              status: 'active',
              startDate,
              nextBillingDate,
              zarinpalDirectDebitToken: verification.data?.card_hash,
            })
            .where(eq(subscription.id, paymentRecord.subscriptionId));
        }
      }
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
    console.error('Payment verification failed:', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to verify payment',
    });
  }
};
