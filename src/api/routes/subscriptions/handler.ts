/**
 * Subscriptions Route Handlers - Direct Database Access
 *
 * Converted from repository pattern to direct database access for consistent
 * performance and to eliminate the abstraction layer. Uses the factory pattern
 * for authentication, validation, transaction management, and error handling.
 */

import crypto from 'node:crypto';

import type { RouteHandler } from '@hono/zod-openapi';
import { and, eq } from 'drizzle-orm';

import { createError } from '@/api/common/error-handling';
import { createHandler, createHandlerWithTransaction, Responses } from '@/api/core';
import { ZarinPalService } from '@/api/services/zarinpal';
import type { ApiEnv } from '@/api/types';
import { getDbAsync } from '@/db';
import { billingEvent, payment, paymentMethod as paymentMethodTable, product, subscription } from '@/db/tables/billing';

import type {
  cancelSubscriptionRoute,
  createSubscriptionRoute,
  getSubscriptionRoute,
  getSubscriptionsRoute,
} from './route';
import {
  CancelSubscriptionRequestSchema,
  CreateSubscriptionRequestSchema,
  SubscriptionParamsSchema,
} from './schema';

// ============================================================================
// SUBSCRIPTION HANDLERS
// ============================================================================

/**
 * GET /subscriptions - Get user subscriptions
 * Refactored: Uses factory pattern + direct database access
 */
export const getSubscriptionsHandler: RouteHandler<typeof getSubscriptionsRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'getSubscriptions',
  },
  async (c) => {
    const user = c.get('user');
    const db = await getDbAsync();

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }
    c.logger.info('Fetching subscriptions for user', { logType: 'operation', operationName: 'getSubscriptions', userId: user.id });

    // Direct database access for subscriptions
    const subscriptions = await db.select().from(subscription).where(eq(subscription.userId, user.id));

    // Transform to match response schema with product data
    const subscriptionsWithProduct = await Promise.all(
      subscriptions.map(async (subscription) => {
        const productResults = await db.select().from(product).where(eq(product.id, subscription.productId)).limit(1);
        const productRecord = productResults[0] || null;

        return {
          ...subscription,
          product: productRecord
            ? {
                id: productRecord.id,
                name: productRecord.name,
                description: productRecord.description,
                billingPeriod: productRecord.billingPeriod,
              }
            : null,
        };
      }),
    );

    c.logger.info('Subscriptions retrieved successfully', {
      logType: 'operation',
      operationName: 'getSubscriptions',
      resource: `subscriptions[${subscriptionsWithProduct.length}]`,
    });

    return Responses.ok(c, subscriptionsWithProduct);
  },
);

/**
 * GET /subscriptions/{id} - Get subscription by ID
 * Refactored: Uses factory pattern + direct database access
 */
export const getSubscriptionHandler: RouteHandler<typeof getSubscriptionRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    validateParams: SubscriptionParamsSchema,
    operationName: 'getSubscription',
  },
  async (c) => {
    const user = c.get('user');
    const db = await getDbAsync();

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }
    const { id } = c.validated.params;

    c.logger.info('Fetching subscription', { logType: 'operation', operationName: 'getSubscription', userId: user.id, resource: id });

    const subscriptionResults = await db.select().from(subscription).where(eq(subscription.id, id)).limit(1);
    const subscriptionRecord = subscriptionResults[0];

    if (!subscriptionRecord || subscriptionRecord.userId !== user.id) {
      c.logger.warn('Subscription not found', { logType: 'operation', operationName: 'getSubscription', userId: user.id, resource: id });
      throw createError.notFound('Subscription');
    }

    // Get product details
    const productResults = await db.select().from(product).where(eq(product.id, subscriptionRecord.productId)).limit(1);
    const productRecord = productResults[0];

    const subscriptionWithProduct = {
      ...subscriptionRecord,
      product: productRecord
        ? {
            id: productRecord.id,
            name: productRecord.name,
            description: productRecord.description,
            billingPeriod: productRecord.billingPeriod,
          }
        : null,
    };

    c.logger.info('Subscription retrieved successfully', { logType: 'operation', operationName: 'getSubscription', resource: id });

    return Responses.ok(c, subscriptionWithProduct);
  },
);

/**
 * POST /subscriptions - Create new subscription
 * Refactored: Uses factory pattern + direct database access + transaction
 */
export const createSubscriptionHandler: RouteHandler<typeof createSubscriptionRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'session',
    validateBody: CreateSubscriptionRequestSchema,
    operationName: 'createSubscription',
  },
  async (c, tx) => {
    const user = c.get('user');

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }
    const { productId, paymentMethod, contractId, enableAutoRenew, callbackUrl, referrer } = c.validated.body;

    c.logger.info('Creating subscription', {
      logType: 'operation',
      operationName: 'createSubscription',
      userId: user.id,
      resource: productId,
    });

    // Validate product exists and is active - use transaction for consistency
    const productResults = await tx.select().from(product).where(eq(product.id, productId)).limit(1);
    const productRecord = productResults[0] || null;

    if (!productRecord || !productRecord.isActive) {
      c.logger.warn('Product not found or inactive', { logType: 'operation', operationName: 'createSubscription', resource: productId });
      throw createError.notFound('Product not found or is not available');
    }

    // Check if user already has an active subscription to this product - use transaction
    const existingSubscriptionResults = await tx.select().from(subscription).where(and(
      eq(subscription.userId, user.id),
      eq(subscription.productId, productId),
      eq(subscription.status, 'active'),
    )).limit(1);
    const existingSubscriptionRecord = existingSubscriptionResults[0] || null;

    if (existingSubscriptionRecord) {
      c.logger.warn('User already has active subscription', {
        logType: 'operation',
        operationName: 'createSubscription',
        userId: user.id,
        resource: existingSubscriptionRecord.id,
      });
      throw createError.conflict('You already have an active subscription to this product');
    }

    let paymentMethodRecord: typeof paymentMethodTable.$inferSelect | null | undefined = null;

    // Handle direct debit contract
    if (paymentMethod === 'direct-debit-contract') {
      if (!contractId) {
        throw createError.internal('Contract ID is required for direct debit subscriptions');
      }

      // Validate contract exists and is active - use transaction
      const paymentMethodResults = await tx.select().from(paymentMethodTable).where(eq(paymentMethodTable.contractSignature, contractId)).limit(1);
      paymentMethodRecord = paymentMethodResults[0] || null;

      if (!paymentMethodRecord || paymentMethodRecord.userId !== user.id || paymentMethodRecord.contractStatus !== 'active') {
        c.logger.warn('Invalid or inactive payment contract', { logType: 'operation', operationName: 'createSubscription', userId: user.id, resource: contractId });
        throw createError.paymentMethodInvalid('Invalid or inactive payment contract');
      }

      c.logger.info('Using direct debit contract', { logType: 'operation', operationName: 'createSubscription', resource: contractId });

      // Create subscription with direct debit
      const subscriptionData = {
        id: crypto.randomUUID(),
        userId: user.id,
        productId: productRecord.id,
        status: 'active' as const,
        startDate: new Date(),
        nextBillingDate: productRecord.billingPeriod === 'monthly'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : null,
        currentPrice: productRecord.price,
        billingPeriod: productRecord.billingPeriod,
        paymentMethodId: paymentMethodRecord.id,
        directDebitContractId: contractId,
        directDebitSignature: paymentMethodRecord.contractSignature,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await tx.insert(subscription).values(subscriptionData);
      const newSubscriptionId = subscriptionData.id;

      // Log subscription creation event - use transaction
      await tx.insert(billingEvent).values({
        id: crypto.randomUUID(),
        userId: user.id,
        subscriptionId: newSubscriptionId,
        paymentId: null,
        paymentMethodId: paymentMethodRecord.id,
        eventType: 'subscription_created_direct_debit',
        eventData: {
          productId: productRecord.id,
          productName: productRecord.name,
          price: productRecord.price,
          billingPeriod: productRecord.billingPeriod,
          contractId,
          autoRenewalEnabled: enableAutoRenew,
        },
        severity: 'info',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // DISPATCH ROUNDTABLE WEBHOOK: Subscription created with direct debit
      try {
        // Get user details for webhook
        const { user: userTable } = await import('@/db/tables/auth');
        const userResults = await tx.select({ email: userTable.email }).from(userTable).where(eq(userTable.id, user.id)).limit(1);
        const userRecord = userResults[0];

        if (userRecord?.email) {
          // Import webhook utilities
          const { WebhookEventBuilders, RoundtableWebhookForwarder } = await import('@/api/routes/webhooks/handler');

          const customerId = WebhookEventBuilders.generateVirtualStripeCustomerId(user.id);
          const sessionId = `cs_${crypto.randomUUID().replace(/-/g, '')}`;
          const priceId = `price_${productRecord.id}`;

          // Create checkout session completed event for new subscription
          const checkoutEvent = WebhookEventBuilders.createCheckoutSessionCompletedEvent(
            sessionId,
            customerId,
            newSubscriptionId,
            priceId,
            user.id,
            {
              userEmail: userRecord.email,
              roundtableProductId: productRecord.roundtableId || productRecord.id,
              productName: productRecord.name,
              planName: (productRecord.metadata as Record<string, unknown>)?.roundtable_plan_name as string || productRecord.name || 'Pro',
              billingUserId: user.id,
              subscriptionType: 'direct_debit',
              contractId,
            },
          );

          // Create subscription created event
          const subscriptionEvent = WebhookEventBuilders.createCustomerSubscriptionCreatedEvent(
            newSubscriptionId,
            customerId,
            {
              userEmail: userRecord.email,
              roundtableProductId: productRecord.roundtableId || productRecord.id,
              productName: productRecord.name,
              planName: (productRecord.metadata as Record<string, unknown>)?.roundtable_plan_name as string || productRecord.name || 'Pro',
              billingUserId: user.id,
              subscriptionType: 'direct_debit',
              contractId,
            },
          );

          // Forward both events to Roundtable
          await Promise.all([
            RoundtableWebhookForwarder.forwardEvent(checkoutEvent),
            RoundtableWebhookForwarder.forwardEvent(subscriptionEvent),
          ]);
        }
      } catch (webhookError) {
        c.logger.error('Failed to dispatch Roundtable webhook for subscription creation', webhookError instanceof Error ? webhookError : new Error(String(webhookError)));
        // Don't fail the subscription creation if webhook fails
      }

      c.logger.info('Direct debit subscription created successfully', {
        logType: 'operation',
        operationName: 'createSubscription',
        resource: newSubscriptionId,
      });

      return Responses.created(c, {
        subscriptionId: newSubscriptionId,
        paymentMethod: 'direct-debit-contract',
        contractId,
        autoRenewalEnabled: enableAutoRenew,
      });
    } else if (paymentMethod === 'zarinpal-oneoff') {
    // Handle legacy one-time ZarinPal payment
      if (!callbackUrl) {
        throw createError.internal('Callback URL is required for ZarinPal payments');
      }

      c.logger.info('Creating legacy ZarinPal subscription', { logType: 'operation', operationName: 'createSubscription', userId: user.id, resource: productId });

      // Convert USD price to Iranian Rials (approximate rate)
      const amountInRials = Math.round(productRecord.price * 65000); // Rough conversion rate

      // Create pending subscription first
      const subscriptionData = {
        id: crypto.randomUUID(),
        userId: user.id,
        productId: productRecord.id,
        status: 'pending' as const,
        startDate: new Date(),
        nextBillingDate: null, // Will be set after payment completion
        currentPrice: productRecord.price,
        billingPeriod: productRecord.billingPeriod,
        paymentMethodId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await tx.insert(subscription).values(subscriptionData);
      const newSubscriptionId = subscriptionData.id;

      // Create payment record
      const paymentData = {
        id: crypto.randomUUID(),
        userId: user.id,
        subscriptionId: newSubscriptionId,
        productId: productRecord.id,
        amount: amountInRials,
        currency: 'IRR' as const,
        status: 'pending' as const,
        paymentMethod: 'zarinpal',
        zarinpalDirectDebitUsed: false,
        metadata: referrer ? { referrer } : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await tx.insert(payment).values(paymentData);
      const paymentRecordId = paymentData.id;

      // Request payment from ZarinPal
      const zarinPal = ZarinPalService.create();
      const paymentResponse = await zarinPal.requestPayment({
        amount: amountInRials,
        currency: 'IRR',
        description: `Subscription to ${productRecord.name}`,
        callbackUrl,
        metadata: {
          subscriptionId: newSubscriptionId,
          paymentId: paymentRecordId,
          userId: user.id,
          ...(referrer && { referrer }),
        },
      });

      if (!paymentResponse.data?.authority) {
        c.logger.error('ZarinPal payment request failed', undefined, {
          logType: 'operation',
          operationName: 'createSubscription',
          resource: paymentRecordId,
        });
        throw createError.zarinpal('Failed to initiate payment');
      }

      // Update payment with ZarinPal authority - use transaction
      await tx.update(payment)
        .set({
          zarinpalAuthority: paymentResponse.data.authority,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentRecordId));

      // Log subscription creation event - use transaction
      await tx.insert(billingEvent).values({
        id: crypto.randomUUID(),
        userId: user.id,
        subscriptionId: newSubscriptionId,
        paymentId: paymentRecordId,
        paymentMethodId: null,
        eventType: 'subscription_created_zarinpal_legacy',
        eventData: {
          productId: productRecord.id,
          productName: productRecord.name,
          price: productRecord.price,
          amount: amountInRials,
          authority: paymentResponse.data.authority,
        },
        severity: 'info',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const paymentUrl = zarinPal.getPaymentUrl(paymentResponse.data.authority);

      c.logger.info('Legacy ZarinPal subscription created successfully', {
        logType: 'operation',
        operationName: 'createSubscription',
        resource: newSubscriptionId,
      });

      return Responses.created(c, {
        subscriptionId: newSubscriptionId,
        paymentMethod: 'zarinpal-oneoff',
        paymentUrl,
        authority: paymentResponse.data.authority,
        autoRenewalEnabled: false, // Legacy payments don't support auto-renewal
      });
    }

    throw createError.internal('Invalid payment method');
  },
);

/**
 * PATCH /subscriptions/{id}/cancel - Cancel subscription
 * Refactored: Uses factory pattern + direct database access + transaction
 */
export const cancelSubscriptionHandler: RouteHandler<typeof cancelSubscriptionRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    validateParams: SubscriptionParamsSchema,
    validateBody: CancelSubscriptionRequestSchema,
    operationName: 'cancelSubscription',
  },
  async (c) => {
    const user = c.get('user');
    const db = await getDbAsync();

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }
    const { id } = c.validated.params;
    const { reason } = c.validated.body;

    c.logger.info('Canceling subscription', {
      logType: 'operation',
      operationName: 'cancelSubscription',
      userId: user.id,
      resource: id,
    });

    const subscriptionResults = await db.select().from(subscription).where(eq(subscription.id, id)).limit(1);
    const subscriptionRecord = subscriptionResults[0] || null;

    if (!subscriptionRecord || subscriptionRecord.userId !== user.id) {
      c.logger.warn('Subscription not found for cancellation', { logType: 'operation', operationName: 'cancelSubscription', userId: user.id, resource: id });
      throw createError.notFound('Subscription');
    }

    if (subscriptionRecord.status !== 'active') {
      c.logger.warn('Subscription not active for cancellation', {
        logType: 'operation',
        operationName: 'cancelSubscription',
        resource: id,
      });
      throw createError.internal('Only active subscriptions can be canceled');
    }

    const canceledAt = new Date();

    // Update subscription status
    await db.update(subscription)
      .set({
        status: 'canceled',
        endDate: canceledAt,
        cancellationReason: reason,
        nextBillingDate: null, // Stop future billing
        updatedAt: new Date(),
      })
      .where(eq(subscription.id, id));

    // Log cancellation event
    await db.insert(billingEvent).values({
      id: crypto.randomUUID(),
      userId: user.id,
      subscriptionId: id,
      paymentId: null,
      paymentMethodId: subscriptionRecord.paymentMethodId,
      eventType: 'subscription_canceled',
      eventData: {
        reason: reason || 'User requested cancellation',
        canceledAt: canceledAt.toISOString(),
        previousStatus: subscriptionRecord.status,
      },
      severity: 'info',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // DISPATCH ROUNDTABLE WEBHOOK: Subscription canceled
    try {
      // Get user details for webhook
      const { user: userTable } = await import('@/db/tables/auth');
      const userResults = await db.select({ email: userTable.email }).from(userTable).where(eq(userTable.id, user.id)).limit(1);
      const userRecord = userResults[0];

      // Get product details
      const productResults = await db.select().from(product).where(eq(product.id, subscriptionRecord.productId)).limit(1);
      const productRecord = productResults[0];

      if (userRecord?.email && productRecord) {
        // Import webhook utilities
        const { WebhookEventBuilders, RoundtableWebhookForwarder } = await import('@/api/routes/webhooks/handler');

        const customerId = WebhookEventBuilders.generateVirtualStripeCustomerId(user.id);

        // Create subscription deleted event
        const subscriptionDeletedEvent = WebhookEventBuilders.createCustomerSubscriptionDeletedEvent(
          id,
          customerId,
          {
            userEmail: userRecord.email,
            roundtableProductId: productRecord.roundtableId || productRecord.id,
            productName: productRecord.name,
            planName: (productRecord.metadata as Record<string, unknown>)?.roundtable_plan_name as string || productRecord.name || 'Pro',
            billingUserId: user.id,
            cancellationReason: reason || 'User requested cancellation',
            canceledAt: canceledAt.toISOString(),
          },
        );

        // Forward event to Roundtable
        await RoundtableWebhookForwarder.forwardEvent(subscriptionDeletedEvent);
      }
    } catch (webhookError) {
      c.logger.error('Failed to dispatch Roundtable webhook for subscription cancellation', webhookError instanceof Error ? webhookError : new Error(String(webhookError)));
      // Don't fail the cancellation if webhook fails
    }

    c.logger.info('Subscription canceled successfully', { logType: 'operation', operationName: 'cancelSubscription', resource: id });

    return Responses.ok(c, {
      subscriptionId: id,
      status: 'canceled' as const,
      canceledAt: canceledAt.toISOString(),
    });
  },
);
