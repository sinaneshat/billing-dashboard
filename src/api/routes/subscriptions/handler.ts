/**
 * Subscriptions Route Handlers - Refactored
 *
 * Uses the factory pattern for consistent authentication, validation,
 * transaction management, and error handling. Leverages the repository
 * pattern for clean data access.
 */

import type { RouteHandler } from '@hono/zod-openapi';

// z type removed - using proper Zod inference without casting
import { createError } from '@/api/common/error-handling';
import { createHandler, createHandlerWithTransaction, Responses } from '@/api/core';
import type { SubscriptionMetadata } from '@/api/core/schemas';
import { billingRepositories } from '@/api/repositories/billing-repositories';
import { ZarinPalService } from '@/api/services/zarinpal';
import type { ApiEnv } from '@/api/types';

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
 * ✅ Refactored: Uses factory pattern + repositories
 */
export const getSubscriptionsHandler: RouteHandler<typeof getSubscriptionsRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'getSubscriptions',
  },
  async (c) => {
    const user = c.get('user')!; // Guaranteed by auth: 'session'
    c.logger.info('Fetching subscriptions for user', { logType: 'operation', operationName: 'getSubscriptions', userId: user.id });

    // Use repository instead of direct DB query
    const subscriptions = await billingRepositories.subscriptions.findSubscriptionsByUserId(user.id);

    // Transform to match response schema with product data
    const subscriptionsWithProduct = await Promise.all(
      subscriptions.map(async (subscription) => {
        const product = await billingRepositories.products.findById(subscription.productId);

        return {
          ...subscription,
          product: product
            ? {
                id: product.id,
                name: product.name,
                description: product.description,
                billingPeriod: product.billingPeriod,
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
 * ✅ Refactored: Uses factory pattern + repositories
 */
export const getSubscriptionHandler: RouteHandler<typeof getSubscriptionRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    validateParams: SubscriptionParamsSchema,
    operationName: 'getSubscription',
  },
  async (c) => {
    const user = c.get('user')!;
    const { id } = c.validated.params;

    c.logger.info('Fetching subscription', { logType: 'operation', operationName: 'getSubscription', userId: user.id, resource: id });

    const subscription = await billingRepositories.subscriptions.findById(id);

    if (!subscription || subscription.userId !== user.id) {
      c.logger.warn('Subscription not found', { logType: 'operation', operationName: 'getSubscription', userId: user.id, resource: id });
      throw createError.notFound('Subscription');
    }

    // Get product details
    const product = await billingRepositories.products.findById(subscription.productId);

    const subscriptionWithProduct = {
      ...subscription,
      product: product
        ? {
            id: product.id,
            name: product.name,
            description: product.description,
            billingPeriod: product.billingPeriod,
          }
        : null,
    };

    c.logger.info('Subscription retrieved successfully', { logType: 'operation', operationName: 'getSubscription', resource: id });

    return Responses.ok(c, subscriptionWithProduct);
  },
);

/**
 * POST /subscriptions - Create new subscription
 * ✅ Refactored: Uses factory pattern + repositories + transaction
 */
export const createSubscriptionHandler: RouteHandler<typeof createSubscriptionRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'session',
    validateBody: CreateSubscriptionRequestSchema,
    operationName: 'createSubscription',
  },
  async (c, tx) => {
    const user = c.get('user')!;
    const { productId, paymentMethod, contractId, enableAutoRenew, callbackUrl } = c.validated.body;

    c.logger.info('Creating subscription', {
      logType: 'operation',
      operationName: 'createSubscription',
      userId: user.id,
      resource: productId,
    });

    // Validate product exists and is active
    const product = await billingRepositories.products.findById(productId);

    if (!product || !product.isActive) {
      c.logger.warn('Product not found or inactive', { logType: 'operation', operationName: 'createSubscription', resource: productId });
      throw createError.notFound('Product not found or is not available');
    }

    // Check if user already has an active subscription to this product
    const existingSubscription = await billingRepositories.subscriptions.findActiveByUserAndProduct(
      user.id,
      productId,
    );

    if (existingSubscription) {
      c.logger.warn('User already has active subscription', {
        logType: 'operation',
        operationName: 'createSubscription',
        userId: user.id,
        resource: existingSubscription.id,
      });
      throw createError.conflict('You already have an active subscription to this product');
    }

    let paymentMethodRecord = null;

    // Handle direct debit contract
    if (paymentMethod === 'direct-debit-contract') {
      if (!contractId) {
        throw createError.internal('Contract ID is required for direct debit subscriptions');
      }

      // Validate contract exists and is active
      paymentMethodRecord = await billingRepositories.paymentMethods.findByContractSignature(contractId);

      if (!paymentMethodRecord || paymentMethodRecord.userId !== user.id || paymentMethodRecord.contractStatus !== 'active') {
        c.logger.warn('Invalid or inactive payment contract', { logType: 'operation', operationName: 'createSubscription', userId: user.id, resource: contractId });
        throw createError.internal('Invalid or inactive payment contract');
      }

      c.logger.info('Using direct debit contract', { logType: 'operation', operationName: 'createSubscription', resource: contractId });

      // Create subscription with direct debit
      const subscriptionData = {
        userId: user.id,
        productId: product.id,
        status: 'active' as const,
        startDate: new Date(),
        nextBillingDate: product.billingPeriod === 'monthly'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : null,
        currentPrice: product.price,
        billingPeriod: product.billingPeriod,
        paymentMethodId: paymentMethodRecord.id,
        directDebitContractId: contractId,
        directDebitSignature: paymentMethodRecord.contractSignature,
      };

      const newSubscription = await billingRepositories.subscriptions.create(subscriptionData, { tx });

      // Log subscription creation event
      await billingRepositories.billingEvents.logEvent({
        userId: user.id,
        subscriptionId: newSubscription.id,
        paymentId: null,
        paymentMethodId: paymentMethodRecord.id,
        eventType: 'subscription_created_direct_debit',
        eventData: {
          productId: product.id,
          productName: product.name,
          price: product.price,
          billingPeriod: product.billingPeriod,
          contractId,
          autoRenewalEnabled: enableAutoRenew,
        },
        severity: 'info',
      }, tx);

      c.logger.info('Direct debit subscription created successfully', {
        logType: 'operation',
        operationName: 'createSubscription',
        resource: newSubscription.id,
      });

      return Responses.created(c, {
        subscriptionId: newSubscription.id,
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
      const amountInRials = Math.round(product.price * 65000); // Rough conversion rate

      // Create pending subscription first
      const subscriptionData = {
        userId: user.id,
        productId: product.id,
        status: 'pending' as const,
        startDate: new Date(),
        nextBillingDate: null, // Will be set after payment completion
        currentPrice: product.price,
        billingPeriod: product.billingPeriod,
        paymentMethodId: null,
      };

      const newSubscription = await billingRepositories.subscriptions.create(subscriptionData, { tx });

      // Create payment record
      const paymentData = {
        userId: user.id,
        subscriptionId: newSubscription.id,
        productId: product.id,
        amount: amountInRials,
        currency: 'IRR' as const,
        status: 'pending' as const,
        paymentMethod: 'zarinpal',
        zarinpalDirectDebitUsed: false,
      };

      const paymentRecord = await billingRepositories.payments.create(paymentData, { tx });

      // Request payment from ZarinPal
      const zarinPal = ZarinPalService.create(c.env);
      const paymentResponse = await zarinPal.requestPayment({
        amount: amountInRials,
        currency: 'IRR',
        description: `Subscription to ${product.name}`,
        callbackUrl,
        metadata: {
          subscriptionId: newSubscription.id,
          paymentId: paymentRecord.id,
          userId: user.id,
        },
      });

      if (!paymentResponse.data?.authority) {
        c.logger.error('ZarinPal payment request failed', undefined, {
          logType: 'operation',
          operationName: 'createSubscription',
          resource: paymentRecord.id,
        });
        throw createError.zarinpal('Failed to initiate payment');
      }

      // Update payment with ZarinPal authority
      await billingRepositories.payments.update(
        paymentRecord.id,
        { zarinpalAuthority: paymentResponse.data.authority },
        { tx },
      );

      // Log subscription creation event
      await billingRepositories.billingEvents.logEvent({
        userId: user.id,
        subscriptionId: newSubscription.id,
        paymentId: paymentRecord.id,
        paymentMethodId: null,
        eventType: 'subscription_created_zarinpal_legacy',
        eventData: {
          productId: product.id,
          productName: product.name,
          price: product.price,
          amount: amountInRials,
          authority: paymentResponse.data.authority,
        },
        severity: 'info',
      }, tx);

      const paymentUrl = zarinPal.getPaymentUrl(paymentResponse.data.authority);

      c.logger.info('Legacy ZarinPal subscription created successfully', {
        logType: 'operation',
        operationName: 'createSubscription',
        resource: newSubscription.id,
      });

      return Responses.created(c, {
        subscriptionId: newSubscription.id,
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
 * ✅ Refactored: Uses factory pattern + repositories + transaction
 */
export const cancelSubscriptionHandler: RouteHandler<typeof cancelSubscriptionRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'session',
    validateParams: SubscriptionParamsSchema,
    validateBody: CancelSubscriptionRequestSchema,
    operationName: 'cancelSubscription',
  },
  async (c, tx) => {
    const user = c.get('user')!;
    const { id } = c.validated.params;
    const { reason } = c.validated.body;

    c.logger.info('Canceling subscription', {
      logType: 'operation',
      operationName: 'cancelSubscription',
      userId: user.id,
      resource: id,
    });

    const subscription = await billingRepositories.subscriptions.findById(id);

    if (!subscription || subscription.userId !== user.id) {
      c.logger.warn('Subscription not found for cancellation', { logType: 'operation', operationName: 'cancelSubscription', userId: user.id, resource: id });
      throw createError.notFound('Subscription');
    }

    if (subscription.status !== 'active') {
      c.logger.warn('Subscription not active for cancellation', {
        logType: 'operation',
        operationName: 'cancelSubscription',
        resource: id,
      });
      throw createError.internal('Only active subscriptions can be canceled');
    }

    const canceledAt = new Date();

    // Update subscription status
    await billingRepositories.subscriptions.update(
      id,
      {
        status: 'canceled',
        endDate: canceledAt,
        cancellationReason: reason,
        nextBillingDate: null, // Stop future billing
      },
      { tx },
    );

    // Log cancellation event
    await billingRepositories.billingEvents.logEvent({
      userId: user.id,
      subscriptionId: id,
      paymentId: null,
      paymentMethodId: subscription.paymentMethodId,
      eventType: 'subscription_canceled',
      eventData: {
        reason: reason || 'User requested cancellation',
        canceledAt: canceledAt.toISOString(),
        previousStatus: subscription.status,
      },
      severity: 'info',
    }, tx);

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
 * ✅ Refactored: Uses factory pattern + repositories + transaction
 */
export const resubscribeHandler: RouteHandler<typeof resubscribeRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'session',
    validateParams: SubscriptionParamsSchema,
    validateBody: CreateSubscriptionRequestSchema.pick({ callbackUrl: true }),
    operationName: 'resubscribe',
  },
  async (c, tx) => {
    const user = c.get('user')!;
    const { id } = c.validated.params;
    const { callbackUrl } = c.validated.body;

    c.logger.info('Resubscribing to subscription', {
      logType: 'operation',
      operationName: 'resubscribe',
      userId: user.id,
      resource: id,
    });

    const subscription = await billingRepositories.subscriptions.findById(id);

    if (!subscription || subscription.userId !== user.id) {
      c.logger.warn('Subscription not found for resubscription', { logType: 'operation', operationName: 'resubscribe', userId: user.id, resource: id });
      throw createError.notFound('Subscription');
    }

    if (subscription.status !== 'canceled') {
      c.logger.warn('Subscription not canceled for resubscription', {
        logType: 'operation',
        operationName: 'resubscribe',
        resource: id,
      });
      throw createError.internal('Only canceled subscriptions can be resubscribed');
    }

    // Get product details
    const product = await billingRepositories.products.findById(subscription.productId);

    if (!product || !product.isActive) {
      c.logger.warn('Product no longer available for resubscription', {
        logType: 'operation',
        operationName: 'resubscribe',
        resource: subscription.productId,
      });
      throw createError.internal('This product is no longer available for subscription');
    }

    // Convert USD price to Iranian Rials
    const amountInRials = Math.round(product.price * 65000);

    // Create payment record for resubscription
    const paymentData = {
      userId: user.id,
      subscriptionId: subscription.id,
      productId: product.id,
      amount: amountInRials,
      currency: 'IRR' as const,
      status: 'pending' as const,
      paymentMethod: 'zarinpal',
      zarinpalDirectDebitUsed: false,
    };

    const paymentRecord = await billingRepositories.payments.create(paymentData, { tx });

    // Validate callback URL is provided
    if (!callbackUrl) {
      throw createError.internal('Callback URL is required for resubscription');
    }

    // Request payment from ZarinPal
    const zarinPal = ZarinPalService.create(c.env);
    const paymentResponse = await zarinPal.requestPayment({
      amount: amountInRials,
      currency: 'IRR',
      description: `Resubscription to ${product.name}`,
      callbackUrl,
      metadata: {
        subscriptionId: subscription.id,
        paymentId: paymentRecord.id,
        userId: user.id,
        isResubscription: true,
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
    await billingRepositories.payments.update(
      paymentRecord.id,
      { zarinpalAuthority: paymentResponse.data.authority },
      { tx },
    );

    // Update subscription to pending (will be activated on payment completion)
    await billingRepositories.subscriptions.update(
      id,
      {
        status: 'pending',
        endDate: null,
        cancellationReason: null,
      },
      { tx },
    );

    // Log resubscription event
    await billingRepositories.billingEvents.logEvent({
      userId: user.id,
      subscriptionId: id,
      paymentId: paymentRecord.id,
      paymentMethodId: null,
      eventType: 'subscription_resubscribed',
      eventData: {
        productId: product.id,
        productName: product.name,
        amount: amountInRials,
        authority: paymentResponse.data.authority,
      },
      severity: 'info',
    }, tx);

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
 * ✅ Refactored: Uses factory pattern + repositories + transaction
 */
export const changePlanHandler: RouteHandler<typeof changePlanRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'session',
    validateParams: SubscriptionParamsSchema,
    validateBody: ChangePlanRequestSchema,
    operationName: 'changePlan',
  },
  async (c, tx) => {
    const user = c.get('user')!;
    const { id } = c.validated.params;
    const { newProductId, callbackUrl, effectiveDate } = c.validated.body;

    c.logger.info('Changing subscription plan', {
      logType: 'operation',
      operationName: 'changePlan',
      userId: user.id,
      resource: id,
    });

    const subscription = await billingRepositories.subscriptions.findById(id);

    if (!subscription || subscription.userId !== user.id) {
      c.logger.warn('Subscription not found for plan change', { logType: 'operation', operationName: 'changePlan', userId: user.id, resource: id });
      throw createError.notFound('Subscription');
    }

    if (subscription.status !== 'active') {
      c.logger.warn('Subscription not active for plan change', {
        logType: 'operation',
        operationName: 'changePlan',
        resource: id,
      });
      throw createError.internal('Only active subscriptions can have their plan changed');
    }

    // Get current and new products
    const [currentProduct, newProduct] = await Promise.all([
      billingRepositories.products.findById(subscription.productId),
      billingRepositories.products.findById(newProductId),
    ]);

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
    const changeDate = effectiveDate === 'immediate' ? new Date() : subscription.nextBillingDate;

    c.logger.info('Plan change analysis', {
      logType: 'operation',
      operationName: 'changePlan',
      resource: id,
    });

    // Calculate proration for immediate changes
    let prorationAmount = null;
    if (effectiveDate === 'immediate' && subscription.nextBillingDate) {
      const daysRemaining = Math.max(0, Math.ceil((subscription.nextBillingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
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
          userId: user.id,
          subscriptionId: subscription.id,
          productId: newProduct.id,
          amount: amountToCharge,
          currency: 'IRR' as const,
          status: 'pending' as const,
          paymentMethod: 'zarinpal',
          zarinpalDirectDebitUsed: false,
        };

        const paymentRecord = await billingRepositories.payments.create(paymentData, { tx });

        // Request payment from ZarinPal
        const zarinPal = ZarinPalService.create(c.env);
        const paymentResponse = await zarinPal.requestPayment({
          amount: amountToCharge,
          currency: 'IRR',
          description: `Plan upgrade to ${newProduct.name}`,
          callbackUrl,
          metadata: {
            subscriptionId: subscription.id,
            paymentId: paymentRecord.id,
            userId: user.id,
            planChange: true,
            oldProductId: currentProduct.id,
            newProductId: newProduct.id,
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

        await billingRepositories.payments.update(
          paymentRecord.id,
          { zarinpalAuthority: paymentResponse.data.authority },
          { tx },
        );

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
      await billingRepositories.subscriptions.update(
        id,
        {
          productId: newProduct.id,
          currentPrice: newProduct.price,
          billingPeriod: newProduct.billingPeriod,
          upgradeDowngradeAt: changeDate,
          prorationCredit: prorationAmount && priceDifference < 0 ? Math.abs(prorationAmount) : 0,
        },
        { tx },
      );
    } else {
      // Store plan change for next billing cycle
      const planChangeMetadata: SubscriptionMetadata = {
        subscriptionType: 'plan_change_pending',
        newProductId,
        scheduledFor: subscription.nextBillingDate!.toISOString(),
        requestedAt: new Date().toISOString(),
        changeType: priceDifference > 0 ? 'upgrade' : priceDifference < 0 ? 'downgrade' : 'lateral',
      };

      await billingRepositories.subscriptions.update(
        id,
        { metadata: planChangeMetadata },
        { tx },
      );
    }

    // Log plan change event
    await billingRepositories.billingEvents.logEvent({
      userId: user.id,
      subscriptionId: id,
      paymentId: null,
      paymentMethodId: subscription.paymentMethodId,
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
    }, tx);

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
