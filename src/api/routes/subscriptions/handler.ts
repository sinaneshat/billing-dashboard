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
import type { SubscriptionMetadata } from '@/api/core/schemas';
import { RoundtableIntegrationService } from '@/api/services/roundtable-integration';
import { ZarinPalService } from '@/api/services/zarinpal';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { billingEvent, payment, paymentMethod as paymentMethodTable, product, subscription } from '@/db/tables/billing';

import type {
  cancelSubscriptionRoute,
  changePlanRoute,
  createSubscriptionRoute,
  getSubscriptionRoute,
  getSubscriptionsRoute,
  resubscribeRoute,
} from './route';
import {
  CancelSubscriptionRequestSchema,
  ChangePlanRequestSchema,
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

      // Update Roundtable database with new subscription
      try {
        const roundtableService = RoundtableIntegrationService.create(c.env);
        await roundtableService.updateUserSubscription({
          userId: user.id,
          planId: productRecord.id,
          subscriptionId: newSubscriptionId,
          paymentId: crypto.randomUUID(), // Generate payment ID for tracking
          amount: productRecord.price,
          currency: 'USD',
          isActive: true,
          startsAt: subscriptionData.startDate.toISOString(),
          endsAt: subscriptionData.nextBillingDate?.toISOString(),
        });

        c.logger.info('Roundtable database updated successfully for direct debit subscription', {
          logType: 'operation',
          operationName: 'createSubscription',
          resource: newSubscriptionId,
        });
      } catch (roundtableError) {
        c.logger.error('Failed to update Roundtable database', roundtableError instanceof Error ? roundtableError : new Error(String(roundtableError)), {
          logType: 'operation',
          operationName: 'createSubscription',
          resource: newSubscriptionId,
        });
        // Continue with response even if Roundtable update fails
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
      const zarinPal = ZarinPalService.create(c.env);
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

    // Update Roundtable database to cancel subscription
    try {
      const roundtableService = RoundtableIntegrationService.create(c.env);
      await roundtableService.cancelUserSubscription(user.id);

      c.logger.info('Roundtable database updated successfully for subscription cancellation', {
        logType: 'operation',
        operationName: 'cancelSubscription',
        resource: id,
      });
    } catch (roundtableError) {
      c.logger.error('Failed to update Roundtable database for cancellation', roundtableError instanceof Error ? roundtableError : new Error(String(roundtableError)), {
        logType: 'operation',
        operationName: 'cancelSubscription',
        resource: id,
      });
      // Continue with response even if Roundtable update fails
    }

    c.logger.info('Subscription canceled successfully', { logType: 'operation', operationName: 'cancelSubscription', resource: id });

    return Responses.ok(c, {
      subscriptionId: id,
      status: 'canceled' as const,
      canceledAt: canceledAt.toISOString(),
    });
  },
);

/**
 * POST /subscriptions/{id}/resubscribe - Resubscribe to canceled subscription
 * Refactored: Uses factory pattern + direct database access + transaction
 */
export const resubscribeHandler: RouteHandler<typeof resubscribeRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    validateParams: SubscriptionParamsSchema,
    validateBody: CreateSubscriptionRequestSchema.pick({ callbackUrl: true, referrer: true }),
    operationName: 'resubscribe',
  },
  async (c) => {
    const user = c.get('user');
    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }
    const { id } = c.validated.params;
    const { callbackUrl, referrer } = c.validated.body;

    c.logger.info('Resubscribing to subscription', {
      logType: 'operation',
      operationName: 'resubscribe',
      userId: user.id,
      resource: id,
    });

    const subscriptionResults = await db.select().from(subscription).where(eq(subscription.id, id)).limit(1);
    const subscriptionRecord = subscriptionResults[0] || null;

    if (!subscriptionRecord || subscriptionRecord.userId !== user.id) {
      c.logger.warn('Subscription not found for resubscription', { logType: 'operation', operationName: 'resubscribe', userId: user.id, resource: id });
      throw createError.notFound('Subscription');
    }

    if (subscriptionRecord.status !== 'canceled') {
      c.logger.warn('Subscription not canceled for resubscription', {
        logType: 'operation',
        operationName: 'resubscribe',
        resource: id,
      });
      throw createError.internal('Only canceled subscriptions can be resubscribed');
    }

    // Get product details
    const productResults = await db.select().from(product).where(eq(product.id, subscriptionRecord.productId)).limit(1);
    const productRecord = productResults[0] || null;

    if (!productRecord || !productRecord.isActive) {
      c.logger.warn('Product no longer available for resubscription', {
        logType: 'operation',
        operationName: 'resubscribe',
        resource: subscriptionRecord.productId,
      });
      throw createError.internal('This product is no longer available for subscription');
    }

    // Convert USD price to Iranian Rials
    const amountInRials = Math.round(productRecord.price * 65000);

    // Create payment record for resubscription
    const paymentData = {
      id: crypto.randomUUID(),
      userId: user.id,
      subscriptionId: subscriptionRecord.id,
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

    await db.insert(payment).values(paymentData);
    const paymentRecordId = paymentData.id;

    // Validate callback URL is provided
    if (!callbackUrl) {
      throw createError.internal('Callback URL is required for resubscription');
    }

    // Request payment from ZarinPal
    const zarinPal = ZarinPalService.create(c.env);
    const paymentResponse = await zarinPal.requestPayment({
      amount: amountInRials,
      currency: 'IRR',
      description: `Resubscription to ${productRecord.name}`,
      callbackUrl,
      metadata: {
        subscriptionId: subscriptionRecord.id,
        paymentId: paymentRecordId,
        userId: user.id,
        isResubscription: true,
        ...(referrer && { referrer }),
      },
    });

    if (!paymentResponse.data?.authority) {
      c.logger.error('ZarinPal payment request failed for resubscription', undefined, {
        logType: 'operation',
        operationName: 'resubscribe',
        resource: id,
      });
      throw createError.zarinpal('Failed to initiate payment for resubscription');
    }

    // Update payment with ZarinPal authority
    await db.update(payment)
      .set({
        zarinpalAuthority: paymentResponse.data.authority,
        updatedAt: new Date(),
      })
      .where(eq(payment.id, paymentRecordId));

    // Update subscription to pending (will be activated on payment completion)
    await db.update(subscription)
      .set({
        status: 'pending',
        endDate: null,
        cancellationReason: null,
        updatedAt: new Date(),
      })
      .where(eq(subscription.id, id));

    // Log resubscription event
    await db.insert(billingEvent).values({
      id: crypto.randomUUID(),
      userId: user.id,
      subscriptionId: id,
      paymentId: paymentRecordId,
      paymentMethodId: null,
      eventType: 'subscription_resubscribed',
      eventData: {
        productId: productRecord.id,
        productName: productRecord.name,
        amount: amountInRials,
        authority: paymentResponse.data.authority,
      },
      severity: 'info',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const paymentUrl = zarinPal.getPaymentUrl(paymentResponse.data.authority);

    c.logger.info('Resubscription initiated successfully', {
      logType: 'operation',
      operationName: 'resubscribe',
      resource: id,
    });

    return Responses.ok(c, {
      subscriptionId: id,
      paymentUrl,
      authority: paymentResponse.data.authority,
    });
  },
);

/**
 * POST /subscriptions/{id}/change-plan - Change subscription plan
 * Refactored: Uses factory pattern + direct database access + transaction
 */
export const changePlanHandler: RouteHandler<typeof changePlanRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    validateParams: SubscriptionParamsSchema,
    validateBody: ChangePlanRequestSchema,
    operationName: 'changePlan',
  },
  async (c) => {
    const user = c.get('user');
    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }
    const { id } = c.validated.params;
    const { newProductId, callbackUrl, effectiveDate, referrer } = c.validated.body;

    c.logger.info('Changing subscription plan', {
      logType: 'operation',
      operationName: 'changePlan',
      userId: user.id,
      resource: id,
    });

    const subscriptionResults = await db.select().from(subscription).where(eq(subscription.id, id)).limit(1);
    const subscriptionRecord = subscriptionResults[0] || null;

    if (!subscriptionRecord || subscriptionRecord.userId !== user.id) {
      c.logger.warn('Subscription not found for plan change', { logType: 'operation', operationName: 'changePlan', userId: user.id, resource: id });
      throw createError.notFound('Subscription');
    }

    if (subscriptionRecord.status !== 'active') {
      c.logger.warn('Subscription not active for plan change', {
        logType: 'operation',
        operationName: 'changePlan',
        resource: id,
      });
      throw createError.internal('Only active subscriptions can have their plan changed');
    }

    // Get current and new products
    const [currentProductResults, newProductResults] = await Promise.all([
      db.select().from(product).where(eq(product.id, subscriptionRecord.productId)).limit(1),
      db.select().from(product).where(eq(product.id, newProductId)).limit(1),
    ]);
    const currentProduct = currentProductResults[0] || null;
    const newProduct = newProductResults[0] || null;

    if (!currentProduct || !newProduct || !newProduct.isActive) {
      c.logger.warn('Products not found for plan change', {
        logType: 'operation',
        operationName: 'changePlan',
        resource: newProductId,
      });
      throw createError.internal('Invalid product selection for plan change');
    }

    const priceDifference = newProduct.price - currentProduct.price;
    const isUpgrade = priceDifference > 0;
    const changeDate = effectiveDate === 'immediate' ? new Date() : subscriptionRecord.nextBillingDate;

    c.logger.info('Plan change analysis', {
      logType: 'operation',
      operationName: 'changePlan',
      resource: id,
    });

    // Calculate proration for immediate changes
    let prorationAmount = null;
    if (effectiveDate === 'immediate' && subscriptionRecord.nextBillingDate) {
      const daysRemaining = Math.max(0, Math.ceil((subscriptionRecord.nextBillingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      );
      const totalDaysInCycle = 30; // Assuming monthly billing
      prorationAmount = (priceDifference * daysRemaining) / totalDaysInCycle;
    }

    // For upgrades or immediate changes, create payment if needed
    let paymentUrl = null;
    let authority = null;

    if (isUpgrade && effectiveDate === 'immediate') {
      const amountToCharge = prorationAmount ? Math.round(prorationAmount * 65000) : Math.round(priceDifference * 65000);

      if (amountToCharge > 0) {
        // Create payment record
        const paymentData = {
          id: crypto.randomUUID(),
          userId: user.id,
          subscriptionId: subscriptionRecord.id,
          productId: newProduct.id,
          amount: amountToCharge,
          currency: 'IRR' as const,
          status: 'pending' as const,
          paymentMethod: 'zarinpal',
          zarinpalDirectDebitUsed: false,
          metadata: referrer ? { referrer } : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.insert(payment).values(paymentData);
        const paymentRecordId = paymentData.id;

        // Request payment from ZarinPal
        const zarinPal = ZarinPalService.create(c.env);
        const paymentResponse = await zarinPal.requestPayment({
          amount: amountToCharge,
          currency: 'IRR',
          description: `Plan upgrade to ${newProduct.name}`,
          callbackUrl,
          metadata: {
            subscriptionId: subscriptionRecord.id,
            paymentId: paymentRecordId,
            userId: user.id,
            planChange: true,
            oldProductId: currentProduct.id,
            newProductId: newProduct.id,
            ...(referrer && { referrer }),
          },
        });

        if (!paymentResponse.data?.authority) {
          c.logger.error('ZarinPal payment request failed for plan change', undefined, {
            logType: 'operation',
            operationName: 'changePlan',
            resource: id,
          });
          throw createError.zarinpal('Failed to initiate payment for plan change');
        }

        await db.update(payment)
          .set({
            zarinpalAuthority: paymentResponse.data.authority,
            updatedAt: new Date(),
          })
          .where(eq(payment.id, paymentRecordId));

        paymentUrl = zarinPal.getPaymentUrl(paymentResponse.data.authority);
        authority = paymentResponse.data.authority;

        c.logger.info('Payment required for plan upgrade', {
          logType: 'operation',
          operationName: 'changePlan',
          resource: authority,
        });
      }
    }

    // Update subscription (either immediately or mark for next billing cycle)
    if (effectiveDate === 'immediate') {
      await db.update(subscription)
        .set({
          productId: newProduct.id,
          currentPrice: newProduct.price,
          billingPeriod: newProduct.billingPeriod,
          upgradeDowngradeAt: changeDate,
          prorationCredit: prorationAmount && priceDifference < 0 ? Math.abs(prorationAmount) : 0,
          updatedAt: new Date(),
        })
        .where(eq(subscription.id, id));
    } else {
      // Store plan change for next billing cycle
      const planChangeMetadata: SubscriptionMetadata = {
        subscriptionType: 'plan_change_pending',
        newProductId,
        scheduledFor: subscriptionRecord.nextBillingDate!.toISOString(),
        requestedAt: new Date().toISOString(),
        changeType: priceDifference > 0 ? 'upgrade' : priceDifference < 0 ? 'downgrade' : 'lateral',
      };

      await db.update(subscription)
        .set({
          metadata: planChangeMetadata,
          updatedAt: new Date(),
        })
        .where(eq(subscription.id, id));
    }

    // Log plan change event
    await db.insert(billingEvent).values({
      id: crypto.randomUUID(),
      userId: user.id,
      subscriptionId: id,
      paymentId: null,
      paymentMethodId: subscriptionRecord.paymentMethodId,
      eventType: 'subscription_plan_changed',
      eventData: {
        oldProductId: currentProduct.id,
        oldProductName: currentProduct.name,
        newProductId: newProduct.id,
        newProductName: newProduct.name,
        effectiveDate,
        priceDifference,
        prorationAmount,
        requiresPayment: !!paymentUrl,
      },
      severity: 'info',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    c.logger.info('Plan change completed successfully', {
      logType: 'operation',
      operationName: 'changePlan',
      resource: id,
    });

    return Responses.ok(c, {
      subscriptionId: id,
      oldProductId: currentProduct.id,
      newProductId: newProduct.id,
      effectiveDate: changeDate?.toISOString() || new Date().toISOString(),
      paymentUrl,
      authority,
      priceDifference,
      prorationAmount,
    });
  },
);
