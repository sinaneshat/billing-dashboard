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
import { HTTPException } from 'hono/http-exception';

import { createError } from '@/api/common/error-handling';
import { createHandler, createHandlerWithBatch, Responses } from '@/api/core';
import { convertUsdToRial, convertUsdToToman } from '@/api/services/unified-currency-service';
import type { ApiEnv } from '@/api/types';
import { getDbAsync } from '@/db';
import { billingEvent, payment, paymentMethod as paymentMethodTable, product, subscription } from '@/db/tables/billing';

import type {
  cancelSubscriptionRoute,
  changePlanRoute,
  createSubscriptionRoute,
  getSubscriptionRoute,
  getSubscriptionsRoute,
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
    const db = await getDbAsync();

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }
    c.logger.info('Fetching subscriptions for user', { logType: 'operation', operationName: 'getSubscriptions', userId: user.id });

    // Direct database access for subscriptions
    const subscriptions = await db.select().from(subscription).where(eq(subscription.userId, user.id));

    // Transform to match response schema with product, payment method data and currency conversion
    const subscriptionsWithProduct = await Promise.all(
      subscriptions.map(async (subscription) => {
        const productResults = await db.select().from(product).where(eq(product.id, subscription.productId)).limit(1);
        const productRecord = productResults[0] || null;

        // Fetch payment method data if available
        let paymentMethodRecord = null;
        if (subscription.paymentMethodId) {
          const paymentMethodResults = await db.select().from(paymentMethodTable).where(eq(paymentMethodTable.id, subscription.paymentMethodId)).limit(1);
          paymentMethodRecord = paymentMethodResults[0] || null;
        }

        // Convert USD subscription currentPrice to Toman - simplified response
        const conversionResult = await convertUsdToToman(subscription.currentPrice);

        return {
          ...subscription,
          // Simplified: only Toman amount and formatted string
          currentPriceToman: conversionResult.tomanPrice,
          formattedPrice: conversionResult.formattedPrice,
          product: productRecord
            ? {
                id: productRecord.id,
                name: productRecord.name,
                description: productRecord.description,
                billingPeriod: productRecord.billingPeriod,
              }
            : null,
          paymentMethod: paymentMethodRecord
            ? {
                id: paymentMethodRecord.id,
                contractDisplayName: paymentMethodRecord.contractDisplayName,
                contractMobile: paymentMethodRecord.contractMobile,
                contractStatus: paymentMethodRecord.contractStatus,
                bankCode: paymentMethodRecord.bankCode,
                isPrimary: paymentMethodRecord.isPrimary,
                isActive: paymentMethodRecord.isActive,
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

    // Get payment method details if available
    let paymentMethodRecord = null;
    if (subscriptionRecord.paymentMethodId) {
      const paymentMethodResults = await db.select().from(paymentMethodTable).where(eq(paymentMethodTable.id, subscriptionRecord.paymentMethodId)).limit(1);
      paymentMethodRecord = paymentMethodResults[0] || null;
    }

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
      paymentMethod: paymentMethodRecord
        ? {
            id: paymentMethodRecord.id,
            contractDisplayName: paymentMethodRecord.contractDisplayName,
            contractMobile: paymentMethodRecord.contractMobile,
            contractStatus: paymentMethodRecord.contractStatus,
            bankCode: paymentMethodRecord.bankCode,
            isPrimary: paymentMethodRecord.isPrimary,
            isActive: paymentMethodRecord.isActive,
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
export const createSubscriptionHandler: RouteHandler<typeof createSubscriptionRoute, ApiEnv> = createHandlerWithBatch(
  {
    auth: 'session',
    validateBody: CreateSubscriptionRequestSchema,
    operationName: 'createSubscription',
  },
  async (c, batch) => {
    const user = c.get('user');

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }
    const { productId, paymentMethod, contractId, enableAutoRenew } = c.validated.body;

    c.logger.info('Creating subscription', {
      logType: 'operation',
      operationName: 'createSubscription',
      userId: user.id,
      resource: productId,
    });

    // Validate product exists and is active - use batch database for reads
    const productResults = await batch.db.select().from(product).where(eq(product.id, productId)).limit(1);
    const productRecord = productResults[0] || null;

    if (!productRecord || !productRecord.isActive) {
      c.logger.warn('Product not found or inactive', { logType: 'operation', operationName: 'createSubscription', resource: productId });
      throw createError.notFound('Product not found or is not available');
    }

    // Check if user already has an active subscription to this product - use batch database for reads
    const existingSubscriptionResults = await batch.db.select().from(subscription).where(and(
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

      // Validate contract exists and is active - use batch database for reads (contractId is the payment method ID)
      const paymentMethodResults = await batch.db.select().from(paymentMethodTable).where(eq(paymentMethodTable.id, contractId)).limit(1);
      paymentMethodRecord = paymentMethodResults[0] || null;

      if (!paymentMethodRecord || paymentMethodRecord.userId !== user.id || paymentMethodRecord.contractStatus !== 'active') {
        c.logger.warn('Invalid or inactive payment contract', { logType: 'operation', operationName: 'createSubscription', userId: user.id, resource: contractId });
        throw createError.paymentMethodInvalid('Invalid or inactive payment contract');
      }

      c.logger.info('Using direct debit contract', { logType: 'operation', operationName: 'createSubscription', resource: contractId });

      // IMMEDIATE BILLING: Charge user immediately for paid plans
      const isFreeProduct = productRecord.price === 0;
      let paymentRecord = null;
      let zarinpalRefId = null;

      if (!isFreeProduct) {
        c.logger.info('Attempting immediate billing for paid plan', {
          logType: 'operation',
          operationName: 'createSubscription',
        });

        try {
          // Convert USD product price to IRR for ZarinPal
          const conversionResult = await convertUsdToRial(productRecord.price);
          const amountInRial = conversionResult.rialPrice;

          c.logger.info(`Currency conversion for billing: $${productRecord.price} USD -> ${amountInRial} IRR (rate: ${conversionResult.exchangeRate})`, {
            logType: 'operation',
            operationName: 'createSubscription',
          });

          // Import ZarinPal direct debit service
          const { ZarinPalDirectDebitService } = await import('@/api/services/zarinpal-direct-debit');
          const zarinpalDirectDebitService = new ZarinPalDirectDebitService({
            serviceName: 'ZarinPal-DirectDebit',
            baseUrl: 'https://api.zarinpal.com',
            timeout: 30000,
            retries: 2,
            merchantId: c.env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID,
            accessToken: c.env.ZARINPAL_ACCESS_TOKEN,
            isSandbox: false,
          });

          // Decrypt the contract signature for charging
          const { decryptSignature } = await import('@/api/utils/crypto');
          let contractSignature: string;

          try {
            if (!paymentMethodRecord.contractSignatureEncrypted) {
              throw new Error('No contract signature found');
            }
            contractSignature = await decryptSignature(paymentMethodRecord.contractSignatureEncrypted);
          } catch (decryptError) {
            c.logger.error('Failed to decrypt contract signature', decryptError instanceof Error ? decryptError : new Error(String(decryptError)));
            throw createError.paymentMethodInvalid('Invalid payment contract signature');
          }

          // Attempt immediate charge using converted IRR amount
          const chargeResult = await zarinpalDirectDebitService.chargeDirectDebit({
            amount: amountInRial,
            currency: 'IRR' as const,
            description: `Subscription to ${productRecord.name} - Immediate Billing`,
            contractSignature,
            metadata: {
              userId: user.id,
              productId: productRecord.id,
              subscriptionType: 'immediate_billing',
            },
          });

          if (!chargeResult.success) {
            c.logger.error('Immediate billing failed');

            throw createError.paymentFailed(`Payment failed: ${chargeResult.error}. Please ensure your bank account has sufficient funds and try again.`);
          }

          zarinpalRefId = chargeResult.data?.refId;
          c.logger.info('Immediate billing successful', {
            logType: 'operation',
            operationName: 'createSubscription',
          });

          // Create payment record for successful charge using converted IRR amount
          const paymentData = {
            userId: user.id,
            subscriptionId: null as string | null, // Will be set after subscription creation
            productId: productRecord.id,
            amount: amountInRial,
            currency: 'IRR',
            status: 'completed' as const,
            paymentMethod: 'zarinpal',
            zarinpalRefId: String(zarinpalRefId),
            zarinpalDirectDebitUsed: true,
          };

          paymentRecord = paymentData;
        } catch (billingError) {
          // If billing fails, don't create the subscription
          c.logger.error('Immediate billing error, cancelling subscription creation', billingError instanceof Error ? billingError : new Error(String(billingError)));

          if (billingError instanceof HTTPException) {
            throw billingError;
          }

          throw createError.paymentFailed('Failed to process payment. Please check your payment method and try again.');
        }
      }

      // Create subscription with direct debit (only after successful payment for paid plans)
      const subscriptionData = {
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
      };

      // Insert subscription to get database-generated ID
      const subscriptionResult = await batch.db.insert(subscription).values(subscriptionData).returning();
      if (!subscriptionResult[0]) {
        throw createError.internal('Failed to create subscription record');
      }
      const newSubscriptionId = subscriptionResult[0].id;

      // Add payment record if there was a successful payment
      let paymentId: string | null = null;
      if (paymentRecord) {
        // Update payment record with subscription ID
        paymentRecord.subscriptionId = newSubscriptionId;
        const paymentResult = await batch.db.insert(payment).values(paymentRecord).returning();
        if (!paymentResult[0]) {
          throw createError.internal('Failed to create payment record');
        }
        paymentId = paymentResult[0].id;

        // Add payment success billing event
        batch.add(batch.db.insert(billingEvent).values({
          userId: user.id,
          subscriptionId: newSubscriptionId,
          paymentId,
          paymentMethodId: paymentMethodRecord.id,
          eventType: 'payment_success_immediate',
          eventData: {
            productId: productRecord.id,
            productName: productRecord.name,
            amount: paymentRecord.amount,
            zarinpalRefId,
            paymentType: 'immediate_billing',
            billingType: 'direct_debit',
          },
          severity: 'info',
        }));
      }

      // Add subscription creation billing event
      batch.add(batch.db.insert(billingEvent).values({
        userId: user.id,
        subscriptionId: newSubscriptionId,
        paymentId,
        paymentMethodId: paymentMethodRecord.id,
        eventType: isFreeProduct ? 'subscription_created_free' : 'subscription_created_direct_debit',
        eventData: {
          productId: productRecord.id,
          productName: productRecord.name,
          price: productRecord.price,
          billingPeriod: productRecord.billingPeriod,
          contractId,
          autoRenewalEnabled: enableAutoRenew,
          immediateBilling: !isFreeProduct,
          paymentSuccessful: !isFreeProduct,
        },
        severity: 'info',
      }));

      // DISPATCH ROUNDTABLE WEBHOOK: Subscription created with direct debit
      try {
        // Get user details for webhook
        const { user: userTable } = await import('@/db/tables/auth');
        const userResults = await batch.db.select({ email: userTable.email }).from(userTable).where(eq(userTable.id, user.id)).limit(1);
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

      // Execute all database operations in batch
      await batch.execute();

      return Responses.created(c, {
        subscriptionId: newSubscriptionId,
        paymentMethod: 'direct-debit-contract',
        contractId,
        autoRenewalEnabled: enableAutoRenew,
        immediateBilling: !isFreeProduct,
        paymentProcessed: paymentRecord !== null,
        ...(paymentRecord && {
          paymentId,
          zarinpalRefId: String(zarinpalRefId),
          chargedAmount: paymentRecord.amount,
        }),
      });
    } else {
      throw createError.badRequest('Invalid payment method. Only direct-debit-contract is supported.');
    }
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
      })
      .where(eq(subscription.id, id));

    // Log cancellation event
    await db.insert(billingEvent).values({
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

/**
 * PATCH /subscriptions/{id} - Change subscription plan
 * Handles plan upgrades/downgrades with proration calculation
 */
export const changePlanHandler: RouteHandler<typeof changePlanRoute, ApiEnv> = createHandlerWithBatch(
  {
    auth: 'session',
    validateParams: SubscriptionParamsSchema,
    validateBody: ChangePlanRequestSchema,
    operationName: 'changePlan',
  },
  async (c, batch) => {
    const user = c.get('user');

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    const { id } = c.validated.params;
    const { productId, effectiveDate } = c.validated.body;

    c.logger.info('Changing subscription plan', {
      logType: 'operation',
      operationName: 'changePlan',
      userId: user.id,
      resource: id,
    });

    // 1. Validate subscription exists and user owns it
    const subscriptionResults = await batch.db.select().from(subscription).where(eq(subscription.id, id)).limit(1);
    const subscriptionRecord = subscriptionResults[0];

    if (!subscriptionRecord || subscriptionRecord.userId !== user.id) {
      c.logger.warn('Subscription not found for plan change', {
        logType: 'operation',
        operationName: 'changePlan',
        userId: user.id,
        resource: id,
      });
      throw createError.notFound('Subscription');
    }

    // 2. Validate subscription is active
    if (subscriptionRecord.status !== 'active') {
      c.logger.warn('Subscription not active for plan change', {
        logType: 'operation',
        operationName: 'changePlan',
        resource: id,
      });
      throw createError.badRequest('Only active subscriptions can be changed');
    }

    // 3. Validate new product exists and is active
    const newProductResults = await batch.db.select().from(product).where(eq(product.id, productId)).limit(1);
    const newProductRecord = newProductResults[0];

    if (!newProductRecord || !newProductRecord.isActive) {
      c.logger.warn('Target product not found or inactive', {
        logType: 'operation',
        operationName: 'changePlan',
        resource: productId,
      });
      throw createError.notFound('Target product not found or is not available');
    }

    // 4. Validate not changing to same product
    if (subscriptionRecord.productId === productId) {
      c.logger.warn('Cannot change to same product', {
        logType: 'operation',
        operationName: 'changePlan',
        resource: id,
      });
      throw createError.conflict('Cannot change to the same product plan');
    }

    // 5. Get current product details
    const currentProductResults = await batch.db.select().from(product).where(eq(product.id, subscriptionRecord.productId)).limit(1);
    const currentProductRecord = currentProductResults[0];

    if (!currentProductRecord) {
      c.logger.error('Current product not found', undefined, {
        logType: 'operation',
        operationName: 'changePlan',
        resource: subscriptionRecord.productId,
      });
      throw createError.internal('Current product not found');
    }

    // 6. Calculate proration
    const now = new Date();
    const nextBillingDate = subscriptionRecord.nextBillingDate ? new Date(subscriptionRecord.nextBillingDate) : null;

    let prorationCredit = 0;
    let netAmount = 0;
    const newNextBillingDate = nextBillingDate;

    if (effectiveDate === 'immediate' && nextBillingDate) {
      // Calculate proration for immediate change
      const totalBillingPeriodMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      const remainingTimeMs = nextBillingDate.getTime() - now.getTime();
      const remainingRatio = Math.max(0, remainingTimeMs / totalBillingPeriodMs);

      // Credit for unused time on current plan
      prorationCredit = Math.floor(subscriptionRecord.currentPrice * remainingRatio);

      // Charge for new plan from now until next billing
      const newPlanCharge = Math.floor(newProductRecord.price * remainingRatio);

      netAmount = newPlanCharge - prorationCredit;

      c.logger.info('Proration calculated', {
        logType: 'operation',
        operationName: 'changePlan',
      });
    } else {
      // For next cycle changes, no proration needed
      netAmount = newProductRecord.price;
    }

    // 7. Update subscription
    const updateData: Partial<typeof subscription.$inferInsert> = {
      productId: newProductRecord.id,
      currentPrice: newProductRecord.price,
      prorationCredit: effectiveDate === 'immediate' ? prorationCredit : 0,
      upgradeDowngradeAt: now,
      updatedAt: now,
    };

    if (effectiveDate === 'immediate') {
      // Apply changes immediately - update next billing date if needed
      updateData.nextBillingDate = newNextBillingDate;
    }

    // Add subscription update to batch
    batch.add(batch.db.update(subscription)
      .set(updateData)
      .where(eq(subscription.id, id)));

    // 8. Create billing event for audit trail - add to batch
    batch.add(batch.db.insert(billingEvent).values({
      userId: user.id,
      subscriptionId: id,
      paymentId: null,
      paymentMethodId: subscriptionRecord.paymentMethodId,
      eventType: 'subscription_plan_changed',
      eventData: {
        previousProductId: currentProductRecord.id,
        previousProductName: currentProductRecord.name,
        previousPrice: subscriptionRecord.currentPrice,
        newProductId: newProductRecord.id,
        newProductName: newProductRecord.name,
        newPrice: newProductRecord.price,
        effectiveDate,
        prorationCredit,
        netAmount,
        changeDate: now.toISOString(),
      },
      severity: 'info',
      createdAt: now,
      updatedAt: now,
    }));

    // 9. DISPATCH ROUNDTABLE WEBHOOK: Subscription plan changed
    try {
      // Get user details for webhook
      const { user: userTable } = await import('@/db/tables/auth');
      const userResults = await batch.db.select({ email: userTable.email }).from(userTable).where(eq(userTable.id, user.id)).limit(1);
      const userRecord = userResults[0];

      if (userRecord?.email) {
        // Import webhook utilities
        const { WebhookEventBuilders, RoundtableWebhookForwarder } = await import('@/api/routes/webhooks/handler');

        const customerId = WebhookEventBuilders.generateVirtualStripeCustomerId(user.id);

        // Create subscription updated event (using created event as a placeholder for plan change)
        const subscriptionUpdatedEvent = WebhookEventBuilders.createCustomerSubscriptionCreatedEvent(
          id,
          customerId,
          {
            userEmail: userRecord.email,
            roundtableProductId: newProductRecord.roundtableId || newProductRecord.id,
            productName: newProductRecord.name,
            planName: (newProductRecord.metadata as Record<string, unknown>)?.roundtable_plan_name as string || newProductRecord.name || 'Pro',
            billingUserId: user.id,
            subscriptionType: 'plan_change',
            previousProductId: currentProductRecord.id,
            previousProductName: currentProductRecord.name,
            effectiveDate,
            prorationCredit: prorationCredit.toString(),
            netAmount: netAmount.toString(),
          },
        );

        // Forward event to Roundtable
        await RoundtableWebhookForwarder.forwardEvent(subscriptionUpdatedEvent);
      }
    } catch (webhookError) {
      c.logger.error('Failed to dispatch Roundtable webhook for plan change', webhookError instanceof Error ? webhookError : new Error(String(webhookError)));
      // Don't fail the plan change if webhook fails
    }

    // Execute all database operations in batch
    await batch.execute();

    c.logger.info('Subscription plan changed successfully', {
      logType: 'operation',
      operationName: 'changePlan',
      resource: id,
    });

    return Responses.ok(c, {
      subscriptionId: id,
      planChanged: true,
      previousProductId: currentProductRecord.id,
      newProductId: newProductRecord.id,
      prorationDetails: {
        creditAmount: prorationCredit,
        chargeAmount: effectiveDate === 'immediate' ? Math.floor(newProductRecord.price * (nextBillingDate ? (nextBillingDate.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000) : 1)) : newProductRecord.price,
        netAmount,
        effectiveDate: now.toISOString(),
        nextBillingDate: (newNextBillingDate || nextBillingDate)?.toISOString() || null,
      },
      autoRenewalEnabled: !!subscriptionRecord.paymentMethodId,
    });
  },
);
