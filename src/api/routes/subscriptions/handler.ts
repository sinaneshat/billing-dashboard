import type { RouteHandler } from '@hono/zod-openapi';
import { and, desc, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { created, ok } from '@/api/common/responses';
import { ZarinPalService } from '@/api/services/zarinpal';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { payment, product, subscription } from '@/db/tables/billing';
import type { PlanChangeHistoryItem } from '@/db/validation';

import type {
  cancelSubscriptionRoute,
  changePlanRoute,
  createSubscriptionRoute,
  getSubscriptionRoute,
  getSubscriptionsRoute,
  resubscribeRoute,
} from './route';

/**
 * Handler for GET /subscriptions
 * Returns all subscriptions for the authenticated user
 */
export const getSubscriptionsHandler: RouteHandler<typeof getSubscriptionsRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'subscriptions');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  try {
    const subscriptions = await db
      .select()
      .from(subscription)
      .innerJoin(product, eq(subscription.productId, product.id))
      .where(eq(subscription.userId, user.id))
      .orderBy(desc(subscription.createdAt));

    const transformedSubscriptions = subscriptions.map(row => ({
      id: row.subscription.id,
      userId: row.subscription.userId,
      productId: row.subscription.productId,
      status: row.subscription.status,
      startDate: row.subscription.startDate.toISOString(),
      endDate: row.subscription.endDate?.toISOString() ?? null,
      nextBillingDate: row.subscription.nextBillingDate?.toISOString() ?? null,
      currentPrice: row.subscription.currentPrice,
      billingPeriod: row.subscription.billingPeriod,
      zarinpalDirectDebitToken: row.subscription.zarinpalDirectDebitToken,
      createdAt: row.subscription.createdAt.toISOString(),
      updatedAt: row.subscription.updatedAt.toISOString(),
      product: {
        id: row.product.id,
        name: row.product.name,
        description: row.product.description,
        billingPeriod: row.product.billingPeriod,
      },
    }));

    return ok(c, transformedSubscriptions);
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to fetch subscriptions',
    });
  }
};

/**
 * Handler for GET /subscriptions/:id
 * Returns a specific subscription for the authenticated user
 */
export const getSubscriptionHandler: RouteHandler<typeof getSubscriptionRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'subscription');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  const { id } = c.req.valid('param');

  try {
    const subscriptionData = await db
      .select()
      .from(subscription)
      .innerJoin(product, eq(subscription.productId, product.id))
      .where(and(eq(subscription.id, id), eq(subscription.userId, user.id)))
      .limit(1);

    if (!subscriptionData.length) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: 'Subscription not found',
      });
    }

    const row = subscriptionData[0]!;
    const transformedSubscription = {
      id: row.subscription.id,
      userId: row.subscription.userId,
      productId: row.subscription.productId,
      status: row.subscription.status,
      startDate: row.subscription.startDate.toISOString(),
      endDate: row.subscription.endDate?.toISOString() ?? null,
      nextBillingDate: row.subscription.nextBillingDate?.toISOString() ?? null,
      currentPrice: row.subscription.currentPrice,
      billingPeriod: row.subscription.billingPeriod,
      zarinpalDirectDebitToken: row.subscription.zarinpalDirectDebitToken,
      createdAt: row.subscription.createdAt.toISOString(),
      updatedAt: row.subscription.updatedAt.toISOString(),
      product: {
        id: row.product.id,
        name: row.product.name,
        description: row.product.description,
        billingPeriod: row.product.billingPeriod,
      },
    };

    return ok(c, transformedSubscription);
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Failed to fetch subscription:', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to fetch subscription',
    });
  }
};

/**
 * Handler for POST /subscriptions
 * Creates a new subscription and initiates payment with ZarinPal
 */
export const createSubscriptionHandler: RouteHandler<typeof createSubscriptionRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'create-subscription');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  const { productId, callbackUrl } = c.req.valid('json');

  try {
    // Check if product exists and is active
    const productData = await db
      .select()
      .from(product)
      .where(and(eq(product.id, productId), eq(product.isActive, true)))
      .limit(1);

    if (!productData.length) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: 'Product not found or inactive',
      });
    }

    const selectedProduct = productData[0]!;

    // Check if user already has an active subscription for this product
    const existingSubscription = await db
      .select()
      .from(subscription)
      .where(
        and(
          eq(subscription.userId, user.id),
          eq(subscription.productId, productId),
          eq(subscription.status, 'active'),
        ),
      )
      .limit(1);

    if (existingSubscription.length > 0) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'You already have an active subscription for this product',
      });
    }

    // Create subscription in pending status
    const subscriptionId = crypto.randomUUID();
    const startDate = new Date();
    const nextBillingDate = selectedProduct.billingPeriod === 'monthly'
      ? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      : null;

    await db.insert(subscription).values({
      id: subscriptionId,
      userId: user.id,
      productId,
      status: 'pending',
      startDate,
      nextBillingDate,
      currentPrice: selectedProduct.price,
      billingPeriod: selectedProduct.billingPeriod,
    });

    // Create payment record
    const paymentId = crypto.randomUUID();
    await db.insert(payment).values({
      id: paymentId,
      userId: user.id,
      subscriptionId,
      productId,
      amount: selectedProduct.price,
      status: 'pending',
      paymentMethod: 'zarinpal',
    });

    // Initialize ZarinPal payment using factory pattern
    const zarinPal = ZarinPalService.fromEnv(c.env);
    const paymentRequest = await zarinPal.requestPayment({
      amount: selectedProduct.price,
      currency: 'IRR',
      description: `Subscription to ${selectedProduct.name}`,
      callbackUrl,
      metadata: {
        subscriptionId,
        paymentId,
        userId: user.id,
      },
    });

    if (!paymentRequest.data?.authority) {
      // Update payment status to failed
      await db
        .update(payment)
        .set({
          status: 'failed',
          failureReason: paymentRequest.data?.message || 'Failed to initialize payment',
          failedAt: new Date(),
        })
        .where(eq(payment.id, paymentId));

      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: `Payment initialization failed: ${paymentRequest.data?.message}`,
      });
    }

    // Update payment record with ZarinPal authority
    await db
      .update(payment)
      .set({
        zarinpalAuthority: paymentRequest.data?.authority,
        metadata: paymentRequest,
      })
      .where(eq(payment.id, paymentId));

    const paymentUrl = zarinPal.getPaymentUrl(paymentRequest.data.authority);

    return created(c, {
      subscriptionId,
      paymentUrl,
      authority: paymentRequest.data?.authority,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Failed to create subscription:', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to create subscription',
    });
  }
};

/**
 * Handler for PATCH /subscriptions/:id/cancel
 * Cancels an active subscription
 */
export const cancelSubscriptionHandler: RouteHandler<typeof cancelSubscriptionRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'cancel-subscription');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  const { id } = c.req.valid('param');
  const { reason } = c.req.valid('json');

  try {
    // Check if subscription exists and belongs to user
    const subscriptionData = await db
      .select()
      .from(subscription)
      .where(and(eq(subscription.id, id), eq(subscription.userId, user.id)))
      .limit(1);

    if (!subscriptionData.length) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: 'Subscription not found',
      });
    }

    const sub = subscriptionData[0]!;

    if (sub.status !== 'active') {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Only active subscriptions can be canceled',
      });
    }

    // Update subscription to canceled
    const canceledAt = new Date();
    await db
      .update(subscription)
      .set({
        status: 'canceled',
        endDate: canceledAt,
        metadata: reason ? { cancellationReason: reason } : undefined,
      })
      .where(eq(subscription.id, id));

    return ok(c, {
      subscriptionId: id,
      status: 'canceled' as const,
      canceledAt: canceledAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Failed to cancel subscription:', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to cancel subscription',
    });
  }
};

/**
 * Handler for POST /subscriptions/:id/resubscribe
 * Reactivates a canceled subscription by initiating new payment
 */
export const resubscribeHandler: RouteHandler<typeof resubscribeRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'resubscribe');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  const { id } = c.req.valid('param');
  const { callbackUrl } = c.req.valid('json');

  try {
    // Get subscription with product data
    const subscriptionData = await db
      .select()
      .from(subscription)
      .innerJoin(product, eq(subscription.productId, product.id))
      .where(and(eq(subscription.id, id), eq(subscription.userId, user.id)))
      .limit(1);

    if (!subscriptionData.length) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: 'Subscription not found',
      });
    }

    const { subscription: sub, product: prod } = subscriptionData[0]!;

    if (sub.status !== 'canceled') {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Only canceled subscriptions can be reactivated',
      });
    }

    if (!prod.isActive) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Product is no longer available',
      });
    }

    // Create new payment record
    const paymentId = crypto.randomUUID();
    await db.insert(payment).values({
      id: paymentId,
      userId: user.id,
      subscriptionId: sub.id,
      productId: sub.productId,
      amount: prod.price, // Use current product price
      status: 'pending',
      paymentMethod: 'zarinpal',
    });

    // Initialize ZarinPal payment using factory pattern
    const zarinPal = ZarinPalService.fromEnv(c.env);
    const paymentRequest = await zarinPal.requestPayment({
      amount: prod.price,
      currency: 'IRR',
      description: `Resubscribe to ${prod.name}`,
      callbackUrl,
      metadata: {
        subscriptionId: sub.id,
        paymentId,
        userId: user.id,
        isResubscribe: true,
      },
    });

    if (!paymentRequest.data?.authority) {
      // Update payment status to failed
      await db
        .update(payment)
        .set({
          status: 'failed',
          failureReason: paymentRequest.data?.message || 'Failed to initialize payment',
          failedAt: new Date(),
        })
        .where(eq(payment.id, paymentId));

      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: `Payment initialization failed: ${paymentRequest.data?.message}`,
      });
    }

    // Update payment record with ZarinPal authority
    await db
      .update(payment)
      .set({
        zarinpalAuthority: paymentRequest.data?.authority,
        metadata: paymentRequest,
      })
      .where(eq(payment.id, paymentId));

    const paymentUrl = zarinPal.getPaymentUrl(paymentRequest.data.authority);

    return ok(c, {
      subscriptionId: sub.id,
      paymentUrl,
      authority: paymentRequest.data?.authority,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Failed to resubscribe:', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to resubscribe',
    });
  }
};

/**
 * Handler for POST /subscriptions/:id/change-plan
 * Changes a subscription to a different plan (upgrade or downgrade)
 */
export const changePlanHandler: RouteHandler<typeof changePlanRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'change-plan');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  const { id } = c.req.valid('param');
  const { newProductId, callbackUrl, effectiveDate } = c.req.valid('json');

  try {
    // Get current subscription with product
    const subscriptionData = await db
      .select()
      .from(subscription)
      .innerJoin(product, eq(subscription.productId, product.id))
      .where(and(eq(subscription.id, id), eq(subscription.userId, user.id)))
      .limit(1);

    if (!subscriptionData.length) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: 'Subscription not found',
      });
    }

    const { subscription: currentSub, product: currentProduct } = subscriptionData[0]!;

    if (currentSub.status !== 'active') {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Only active subscriptions can change plans',
      });
    }

    // Get the new product
    const newProductData = await db
      .select()
      .from(product)
      .where(and(eq(product.id, newProductId), eq(product.isActive, true)))
      .limit(1);

    if (!newProductData.length) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: 'New product not found or inactive',
      });
    }

    const newProduct = newProductData[0]!;

    if (currentProduct.id === newProduct.id) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Cannot change to the same plan',
      });
    }

    const priceDifference = newProduct.price - currentProduct.price;
    let paymentUrl: string | null = null;
    let authority: string | null = null;
    let prorationAmount: number | null = null;

    const now = new Date();
    let effectiveDateTimestamp = now;

    // Calculate effective date
    if (effectiveDate === 'next_billing_cycle' && currentSub.nextBillingDate) {
      effectiveDateTimestamp = currentSub.nextBillingDate;
    }

    // For immediate changes, calculate proration if it's an upgrade
    if (effectiveDate === 'immediate' && priceDifference > 0) {
      // Calculate prorated amount based on remaining days in current billing cycle
      if (currentSub.nextBillingDate && currentProduct.billingPeriod === 'monthly') {
        const daysInMonth = 30; // Simplified - could be more accurate
        const remainingDays = Math.ceil(
          (currentSub.nextBillingDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );
        prorationAmount = Math.round((priceDifference * remainingDays) / daysInMonth);
      } else {
        prorationAmount = priceDifference;
      }

      // If it's an upgrade requiring payment, create payment flow
      if (prorationAmount > 0) {
        const paymentId = crypto.randomUUID();
        await db.insert(payment).values({
          id: paymentId,
          userId: user.id,
          subscriptionId: currentSub.id,
          productId: newProduct.id,
          amount: prorationAmount,
          status: 'pending',
          paymentMethod: 'zarinpal',
        });

        // Initialize ZarinPal payment
        const zarinPal = ZarinPalService.fromEnv(c.env);
        const paymentRequest = await zarinPal.requestPayment({
          amount: prorationAmount,
          currency: 'IRR',
          description: `Plan upgrade from ${currentProduct.name} to ${newProduct.name}`,
          callbackUrl,
          metadata: {
            subscriptionId: currentSub.id,
            paymentId,
            userId: user.id,
            planChange: true,
            oldProductId: currentProduct.id,
            newProductId: newProduct.id,
          },
        });

        if (!paymentRequest.data?.authority) {
          await db
            .update(payment)
            .set({
              status: 'failed',
              failureReason: paymentRequest.data?.message || 'Failed to initialize payment',
              failedAt: now,
            })
            .where(eq(payment.id, paymentId));

          throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
            message: `Payment initialization failed: ${paymentRequest.data?.message}`,
          });
        }

        await db
          .update(payment)
          .set({
            zarinpalAuthority: paymentRequest.data?.authority,
            metadata: paymentRequest,
          })
          .where(eq(payment.id, paymentId));

        paymentUrl = zarinPal.getPaymentUrl(paymentRequest.data.authority);
        authority = paymentRequest.data?.authority;
      }
    }

    // Update subscription if no payment required or it's a downgrade/next cycle change
    if (!paymentUrl) {
      const nextBillingDate = effectiveDateTimestamp.getTime() === now.getTime()
        ? (newProduct.billingPeriod === 'monthly'
            ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
            : null)
        : currentSub.nextBillingDate;

      await db
        .update(subscription)
        .set({
          productId: newProduct.id,
          currentPrice: newProduct.price,
          billingPeriod: newProduct.billingPeriod,
          nextBillingDate,
          updatedAt: now,
          metadata: {
            planChangeHistory: [
              ...(currentSub.metadata && typeof currentSub.metadata === 'object' && 'planChangeHistory' in currentSub.metadata
                ? currentSub.metadata.planChangeHistory as PlanChangeHistoryItem[]
                : []),
              {
                fromProductId: currentProduct.id,
                toProductId: newProduct.id,
                fromPrice: currentProduct.price,
                toPrice: newProduct.price,
                changedAt: effectiveDateTimestamp.toISOString(),
                effectiveDate,
              },
            ],
          },
        })
        .where(eq(subscription.id, id));
    }

    return ok(c, {
      subscriptionId: id,
      oldProductId: currentProduct.id,
      newProductId: newProduct.id,
      effectiveDate: effectiveDateTimestamp.toISOString(),
      paymentUrl,
      authority,
      priceDifference,
      prorationAmount,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Failed to change plan:', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to change plan',
    });
  }
};
