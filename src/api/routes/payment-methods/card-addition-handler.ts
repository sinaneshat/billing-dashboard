/**
 * Card Addition Handlers
 * Implements ZarinPal Direct Payment card addition and verification flow
 */

import type { RouteHandler } from '@hono/zod-openapi';
import { and, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { ok } from '@/api/common/responses';
import { ZarinPalService } from '@/api/services/zarinpal';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { payment, paymentMethod, subscription } from '@/db/tables/billing';

import type {
  enableDirectDebitRoute,
  initiateCardAdditionRoute,
  verifyCardAdditionRoute,
} from './card-addition';

// Card verification request storage using database instead of memory
// This prevents memory leaks and works in serverless environments

/**
 * Handler for POST /payment-methods/card-addition
 * Initiates ZarinPal card verification flow for Direct Payment
 */
export const initiateCardAdditionHandler: RouteHandler<typeof initiateCardAdditionRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'initiate-card-addition');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  const { callbackUrl, metadata } = c.req.valid('json');

  try {
    const zarinPal = ZarinPalService.fromEnv(c.env);

    // Use configuration from environment instead of hardcoded values
    const verificationAmount = Number(c.env.CARD_VERIFICATION_AMOUNT) || 1000;

    // Create a minimal payment request for card verification
    const verificationResult = await zarinPal.requestPayment({
      amount: verificationAmount,
      currency: 'IRR',
      description: c.env.CARD_VERIFICATION_DESCRIPTION || 'Card verification for direct payment',
      callbackUrl,
      metadata: {
        type: 'card_verification',
        userId: user.id,
        ...metadata,
      },
    });

    if (!verificationResult.data?.authority) {
      throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
        message: 'Failed to initiate card verification with ZarinPal',
      });
    }

    const authority = verificationResult.data.authority;

    // Store verification request in database using payment table
    const verificationPaymentId = crypto.randomUUID();
    await db.insert(payment).values({
      id: verificationPaymentId,
      userId: user.id,
      productId: 'card-verification', // Special product ID for verification
      amount: verificationAmount,
      status: 'pending',
      paymentMethod: 'zarinpal',
      zarinpalAuthority: authority,
      metadata: {
        type: 'card_verification',
        callbackUrl,
        ...metadata,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const verificationUrl = zarinPal.getPaymentUrl(authority);

    return ok(c, {
      verificationUrl,
      authority,
      requestId: verificationPaymentId,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Failed to initiate card addition:', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to initiate card addition process',
    });
  }
};

/**
 * Handler for POST /payment-methods/verify-card
 * Verifies card and creates payment method record
 */
export const verifyCardAdditionHandler: RouteHandler<typeof verifyCardAdditionRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'verify-card-addition');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  const { authority, status } = c.req.valid('json');

  try {
    // Get stored verification request from database
    const storedRequests = await db
      .select()
      .from(payment)
      .where(
        and(
          eq(payment.zarinpalAuthority, authority),
          eq(payment.userId, user.id),
          eq(payment.status, 'pending'),
        ),
      )
      .limit(1);

    if (!storedRequests.length) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Invalid or expired card verification request',
      });
    }

    const storedRequest = storedRequests[0]!;

    // Check if user canceled the process
    if (status === 'cancel' || status === 'NOK') {
      // Mark verification as failed
      await db
        .update(payment)
        .set({
          status: 'failed',
          failureReason: 'User canceled card verification',
          failedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payment.id, storedRequest.id));

      return ok(c, {
        verified: false,
      });
    }

    const zarinPal = ZarinPalService.fromEnv(c.env);

    // Verify the payment with ZarinPal using the same amount from the stored request
    const verificationResult = await zarinPal.verifyPayment({
      authority,
      amount: storedRequest.amount,
    });

    if (verificationResult.data?.code !== 100) {
      // Mark verification as failed and store the error
      await db
        .update(payment)
        .set({
          status: 'failed',
          failureReason: verificationResult.data?.message || 'Card verification failed',
          failedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payment.id, storedRequest.id));

      return ok(c, {
        verified: false,
        error: {
          code: verificationResult.data?.code?.toString() || 'verification_failed',
          message: verificationResult.data?.message || 'Card verification failed',
        },
      });
    }

    // Extract card information from verification result
    const cardHash = verificationResult.data.card_hash;
    const cardPan = verificationResult.data.card_pan;

    if (!cardHash) {
      throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
        message: 'ZarinPal did not provide card hash for direct payment',
      });
    }

    // Check if this card is already saved for this user
    const existingPaymentMethod = await db
      .select()
      .from(paymentMethod)
      .where(
        and(
          eq(paymentMethod.userId, user.id),
          eq(paymentMethod.zarinpalCardHash, cardHash),
          eq(paymentMethod.isActive, true),
        ),
      )
      .limit(1);

    if (existingPaymentMethod.length > 0) {
      // Mark verification as completed
      await db
        .update(payment)
        .set({
          status: 'completed',
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payment.id, storedRequest.id));

      return ok(c, {
        paymentMethod: {
          id: existingPaymentMethod[0]!.id,
          zarinpalCardHash: existingPaymentMethod[0]!.zarinpalCardHash,
          cardMask: existingPaymentMethod[0]!.cardMask,
          cardType: existingPaymentMethod[0]!.cardType,
          isPrimary: existingPaymentMethod[0]!.isPrimary ?? false,
          isActive: existingPaymentMethod[0]!.isActive ?? true,
          createdAt: existingPaymentMethod[0]!.createdAt.toISOString(),
        },
        verified: true,
      });
    }

    // Create card mask from PAN
    const cardMask = cardPan
      ? `**** **** **** ${cardPan.slice(-4)}`
      : `**** **** **** ****`;

    // Determine if this should be the primary payment method
    const existingPrimaryMethods = await db
      .select()
      .from(paymentMethod)
      .where(
        and(
          eq(paymentMethod.userId, user.id),
          eq(paymentMethod.isPrimary, true),
          eq(paymentMethod.isActive, true),
        ),
      );

    const shouldBePrimary = existingPrimaryMethods.length === 0;

    // Create the new payment method
    const paymentMethodId = crypto.randomUUID();
    const now = new Date();

    await db.insert(paymentMethod).values({
      id: paymentMethodId,
      userId: user.id,
      zarinpalCardHash: cardHash,
      cardMask,
      cardType: null, // ZarinPal doesn't always provide this
      isPrimary: shouldBePrimary,
      isActive: true,
      lastUsedAt: now, // Just used for verification
      expiresAt: null,
      createdAt: now,
      updatedAt: now,
      metadata: {
        addedVia: 'direct_payment_verification',
        verificationAuthority: authority,
        verificationRefId: verificationResult.data.ref_id,
        ...(storedRequest.metadata as Record<string, unknown> || {}),
      },
    });

    // Mark verification payment as completed
    await db
      .update(payment)
      .set({
        status: 'completed',
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payment.id, storedRequest.id));

    // Fetch the created payment method
    const createdPaymentMethod = await db
      .select()
      .from(paymentMethod)
      .where(eq(paymentMethod.id, paymentMethodId))
      .limit(1);

    if (!createdPaymentMethod.length) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Failed to create payment method',
      });
    }

    const pm = createdPaymentMethod[0]!;

    return ok(c, {
      paymentMethod: {
        id: pm.id,
        zarinpalCardHash: pm.zarinpalCardHash,
        cardMask: pm.cardMask,
        cardType: pm.cardType,
        isPrimary: pm.isPrimary ?? false,
        isActive: pm.isActive ?? true,
        createdAt: pm.createdAt.toISOString(),
      },
      verified: true,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Failed to verify card addition:', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to verify card addition',
    });
  }
};

/**
 * Handler for POST /payment-methods/:id/enable-direct-debit
 * Enables direct debit for a payment method and optionally links to subscription
 */
export const enableDirectDebitHandler: RouteHandler<typeof enableDirectDebitRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'enable-direct-debit');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  const { id: paymentMethodId } = c.req.valid('param');
  const { subscriptionId } = c.req.valid('json');

  try {
    // Verify payment method exists and belongs to user
    const existingPaymentMethod = await db
      .select()
      .from(paymentMethod)
      .where(
        and(
          eq(paymentMethod.id, paymentMethodId),
          eq(paymentMethod.userId, user.id),
          eq(paymentMethod.isActive, true),
        ),
      )
      .limit(1);

    if (!existingPaymentMethod.length) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: 'Payment method not found',
      });
    }

    const pm = existingPaymentMethod[0]!;

    if (!pm.zarinpalCardHash) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Payment method does not have valid card hash for direct debit',
      });
    }

    const now = new Date();

    // If subscription ID is provided, link the payment method to the subscription
    if (subscriptionId) {
      // Verify subscription exists and belongs to user
      const existingSubscription = await db
        .select()
        .from(subscription)
        .where(
          and(
            eq(subscription.id, subscriptionId),
            eq(subscription.userId, user.id),
            eq(subscription.status, 'active'),
          ),
        )
        .limit(1);

      if (!existingSubscription.length) {
        throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
          message: 'Active subscription not found',
        });
      }

      // Update subscription with direct debit information
      await db
        .update(subscription)
        .set({
          paymentMethodId,
          zarinpalDirectDebitToken: pm.zarinpalCardHash,
          updatedAt: now,
        })
        .where(eq(subscription.id, subscriptionId));
    }

    // Update payment method with direct debit enabled timestamp
    await db
      .update(paymentMethod)
      .set({
        lastUsedAt: now,
        updatedAt: now,
        metadata: {
          ...(pm.metadata as Record<string, unknown> || {}),
          directDebitEnabled: true,
          directDebitEnabledAt: now.toISOString(),
        },
      })
      .where(eq(paymentMethod.id, paymentMethodId));

    return ok(c, {
      directDebitEnabled: true,
      subscriptionId: subscriptionId ?? null,
      enabledAt: now.toISOString(),
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Failed to enable direct debit:', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to enable direct debit',
    });
  }
};
