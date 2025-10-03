import type { RouteHandler } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { createError } from '@/api/common/error-handling';
import { createHandler, createHandlerWithBatch, Responses } from '@/api/core';
import { apiLogger } from '@/api/middleware/hono-logger';
import { stripeService } from '@/api/services/stripe.service';
import type { ApiEnv } from '@/api/types';
import { getDbAsync } from '@/db';
import * as tables from '@/db/schema';

import type {
  cancelSubscriptionRoute,
  createCheckoutSessionRoute,
  getProductRoute,
  getSubscriptionRoute,
  handleWebhookRoute,
  listProductsRoute,
  listSubscriptionsRoute,
} from './route';
import {
  CancelSubscriptionRequestSchema,
  CheckoutRequestSchema,
  ProductIdParamSchema,
  SubscriptionIdParamSchema,
} from './schema';

// ============================================================================
// Product Handlers
// ============================================================================

export const listProductsHandler: RouteHandler<typeof listProductsRoute, ApiEnv> = createHandler(
  {
    auth: 'public',
    operationName: 'listProducts',
  },
  async (c) => {
    // Operation start logging
    c.logger.info('Listing all products', {
      logType: 'operation',
      operationName: 'listProducts',
    });

    try {
      const stripeProducts = await stripeService.listProducts();

      const products = await Promise.all(
        stripeProducts.map(async (product) => {
          const prices = await stripeService.listPrices(product.id);

          // Parse features from metadata
          let features: string[] | null = null;
          if (product.metadata?.features) {
            try {
              const parsed = JSON.parse(product.metadata.features);
              features = Array.isArray(parsed) ? parsed : null;
            } catch {
              features = null;
            }
          }

          return {
            id: product.id,
            name: product.name,
            description: product.description || null,
            features,
            active: product.active,
            prices: prices.map(price => ({
              id: price.id,
              productId: typeof price.product === 'string' ? price.product : price.product.id,
              unitAmount: price.unit_amount || 0,
              currency: price.currency,
              interval: (price.recurring?.interval || 'month') as 'month' | 'year',
              trialPeriodDays: price.recurring?.trial_period_days || null,
              active: price.active,
            })),
          };
        }),
      );

      // Success logging with resource count
      c.logger.info('Products retrieved successfully', {
        logType: 'operation',
        operationName: 'listProducts',
        resource: `products[${products.length}]`,
      });

      return Responses.ok(c, {
        products,
        count: products.length,
      });
    } catch (error) {
      // Error logging with proper Error instance
      c.logger.error('Failed to list products', error instanceof Error ? error : new Error(String(error)));
      throw createError.internal('Failed to retrieve products');
    }
  },
);

export const getProductHandler: RouteHandler<typeof getProductRoute, ApiEnv> = createHandler(
  {
    auth: 'public',
    validateParams: ProductIdParamSchema,
    operationName: 'getProduct',
  },
  async (c) => {
    const { id } = c.validated.params;

    c.logger.info('Fetching product details', {
      logType: 'operation',
      operationName: 'getProduct',
      resource: id,
    });

    try {
      const stripeProduct = await stripeService.getProduct(id);
      const prices = await stripeService.listPrices(id);

      // Parse features from metadata
      let features: string[] | null = null;
      if (stripeProduct.metadata?.features) {
        try {
          const parsed = JSON.parse(stripeProduct.metadata.features);
          features = Array.isArray(parsed) ? parsed : null;
        } catch {
          features = null;
        }
      }

      const product = {
        id: stripeProduct.id,
        name: stripeProduct.name,
        description: stripeProduct.description || null,
        features,
        active: stripeProduct.active,
        prices: prices.map(price => ({
          id: price.id,
          productId: typeof price.product === 'string' ? price.product : price.product.id,
          unitAmount: price.unit_amount || 0,
          currency: price.currency,
          interval: (price.recurring?.interval || 'month') as 'month' | 'year',
          trialPeriodDays: price.recurring?.trial_period_days || null,
          active: price.active,
        })),
      };

      c.logger.info('Product retrieved successfully', {
        logType: 'operation',
        operationName: 'getProduct',
        resource: id,
      });

      return Responses.ok(c, { product });
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError && error.type === 'StripeInvalidRequestError') {
        throw createError.notFound(`Product ${id} not found`);
      }
      c.logger.error('Failed to get product', error instanceof Error ? error : new Error(String(error)));
      throw createError.internal('Failed to retrieve product');
    }
  },
);

// ============================================================================
// Checkout Handlers
// ============================================================================

export const createCheckoutSessionHandler: RouteHandler<typeof createCheckoutSessionRoute, ApiEnv> = createHandlerWithBatch(
  {
    auth: 'session',
    validateBody: CheckoutRequestSchema,
    operationName: 'createCheckoutSession',
  },
  async (c, batch) => {
    const user = c.get('user');
    const body = c.validated.body;

    if (!user) {
      throw createError.unauthenticated('Valid session required for checkout');
    }

    // Operation start logging with user and resource
    c.logger.info('Creating checkout session', {
      logType: 'operation',
      operationName: 'createCheckoutSession',
      userId: user.id,
      resource: body.priceId,
    });

    try {
      const db = await getDbAsync();

      // Get or create Stripe customer
      const stripeCustomer = await db.query.stripeCustomer.findFirst({
        where: eq(tables.stripeCustomer.userId, user.id),
      });

      let customerId: string;

      if (!stripeCustomer) {
        const customer = await stripeService.createCustomer({
          email: user.email,
          name: user.name || undefined,
          metadata: { userId: user.id },
        });

        // Insert using batch.db for atomic operation
        const [insertedCustomer] = await batch.db.insert(tables.stripeCustomer).values({
          id: customer.id,
          userId: user.id,
          email: customer.email ?? user.email,
          name: customer.name ?? null,
          createdAt: new Date(customer.created * 1000),
          updatedAt: new Date(),
        }).returning();

        if (!insertedCustomer) {
          throw createError.internal('Failed to create customer record', {
            errorType: 'database',
            operation: 'insert',
            table: 'stripeCustomer',
          });
        }

        customerId = insertedCustomer.id;

        // Log customer creation
        c.logger.info('Created new Stripe customer', {
          logType: 'operation',
          operationName: 'createCheckoutSession',
          userId: user.id,
          resource: customerId,
        });
      } else {
        customerId = stripeCustomer.id;

        // Log using existing customer
        c.logger.info('Using existing Stripe customer', {
          logType: 'operation',
          operationName: 'createCheckoutSession',
          userId: user.id,
          resource: customerId,
        });
      }

      const appUrl = c.env.NEXT_PUBLIC_APP_URL;
      const successUrl = body.successUrl || `${appUrl}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = body.cancelUrl || `${appUrl}/dashboard/billing`;

      const session = await stripeService.createCheckoutSession({
        priceId: body.priceId,
        customerId,
        successUrl,
        cancelUrl,
        metadata: { userId: user.id },
      });

      if (!session.url) {
        throw createError.internal('Checkout session created but URL is missing');
      }

      // Success logging with session ID
      c.logger.info('Checkout session created successfully', {
        logType: 'operation',
        operationName: 'createCheckoutSession',
        userId: user.id,
        resource: session.id,
      });

      return Responses.ok(c, {
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      // Error logging with proper Error instance
      c.logger.error('Failed to create checkout session', error instanceof Error ? error : new Error(String(error)));
      throw createError.internal('Failed to create checkout session');
    }
  },
);

// ============================================================================
// Subscription Handlers
// ============================================================================

export const listSubscriptionsHandler: RouteHandler<typeof listSubscriptionsRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'listSubscriptions',
  },
  async (c) => {
    const user = c.get('user');

    if (!user) {
      throw createError.unauthenticated('Valid session required to list subscriptions');
    }

    // Operation start logging
    c.logger.info('Listing user subscriptions', {
      logType: 'operation',
      operationName: 'listSubscriptions',
      userId: user.id,
    });

    try {
      const db = await getDbAsync();

      const dbSubscriptions = await db.query.stripeSubscription.findMany({
        where: eq(tables.stripeSubscription.userId, user.id),
        with: {
          price: {
            columns: {
              productId: true,
            },
          },
        },
      });

      const subscriptions = dbSubscriptions.map((sub: typeof tables.stripeSubscription.$inferSelect & { price: { productId: string } }) => ({
        id: sub.id,
        status: sub.status as 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'paused',
        priceId: sub.priceId,
        productId: sub.price.productId,
        currentPeriodStart: sub.currentPeriodStart.toISOString(),
        currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        canceledAt: sub.canceledAt?.toISOString() || null,
        trialStart: sub.trialStart?.toISOString() || null,
        trialEnd: sub.trialEnd?.toISOString() || null,
      }));

      // Success logging with resource count
      c.logger.info('Subscriptions retrieved successfully', {
        logType: 'operation',
        operationName: 'listSubscriptions',
        userId: user.id,
        resource: `subscriptions[${subscriptions.length}]`,
      });

      return Responses.ok(c, {
        subscriptions,
        count: subscriptions.length,
      });
    } catch (error) {
      // Error logging with proper Error instance
      c.logger.error('Failed to list subscriptions', error instanceof Error ? error : new Error(String(error)));
      throw createError.internal('Failed to retrieve subscriptions');
    }
  },
);

export const getSubscriptionHandler: RouteHandler<typeof getSubscriptionRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    validateParams: SubscriptionIdParamSchema,
    operationName: 'getSubscription',
  },
  async (c) => {
    const user = c.get('user');
    const { id } = c.validated.params;

    if (!user) {
      throw createError.unauthenticated('Valid session required to view subscription');
    }

    c.logger.info('Fetching subscription details', {
      logType: 'operation',
      operationName: 'getSubscription',
      userId: user.id,
      resource: id,
    });

    const db = await getDbAsync();

    try {
      const subscription = await db.query.stripeSubscription.findFirst({
        where: eq(tables.stripeSubscription.id, id),
        with: {
          price: {
            columns: {
              productId: true,
            },
          },
        },
      });

      if (!subscription) {
        // Warning log before throwing not found error
        c.logger.warn('Subscription not found', {
          logType: 'operation',
          operationName: 'getSubscription',
          userId: user.id,
          resource: id,
        });
        throw createError.notFound(`Subscription ${id} not found`);
      }

      if (subscription.userId !== user.id) {
        // Warning log before throwing unauthorized error
        c.logger.warn('Unauthorized subscription access attempt', {
          logType: 'operation',
          operationName: 'getSubscription',
          userId: user.id,
          resource: id,
        });
        throw createError.unauthorized('You do not have access to this subscription');
      }

      c.logger.info('Subscription retrieved successfully', {
        logType: 'operation',
        operationName: 'getSubscription',
        userId: user.id,
        resource: id,
      });

      return Responses.ok(c, {
        subscription: {
          id: subscription.id,
          status: subscription.status as 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'paused',
          priceId: subscription.priceId,
          productId: subscription.price.productId,
          currentPeriodStart: subscription.currentPeriodStart.toISOString(),
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          canceledAt: subscription.canceledAt?.toISOString() || null,
          trialStart: subscription.trialStart?.toISOString() || null,
          trialEnd: subscription.trialEnd?.toISOString() || null,
        },
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
      c.logger.error('Failed to get subscription', error instanceof Error ? error : new Error(String(error)));
      throw createError.internal('Failed to retrieve subscription');
    }
  },
);

export const cancelSubscriptionHandler: RouteHandler<typeof cancelSubscriptionRoute, ApiEnv> = createHandlerWithBatch(
  {
    auth: 'session',
    validateParams: SubscriptionIdParamSchema,
    validateBody: CancelSubscriptionRequestSchema,
    operationName: 'cancelSubscription',
  },
  async (c, batch) => {
    const user = c.get('user');
    const { id } = c.validated.params;
    const body = c.validated.body;

    if (!user) {
      throw createError.unauthenticated('Valid session required to cancel subscription');
    }

    c.logger.info('Canceling subscription', {
      logType: 'operation',
      operationName: 'cancelSubscription',
      userId: user.id,
      resource: id,
    });

    const db = await getDbAsync();

    try {
      const subscription = await db.query.stripeSubscription.findFirst({
        where: eq(tables.stripeSubscription.id, id),
      });

      if (!subscription) {
        // Warning log before throwing not found error
        c.logger.warn('Subscription not found for cancellation', {
          logType: 'operation',
          operationName: 'cancelSubscription',
          userId: user.id,
          resource: id,
        });
        throw createError.notFound(`Subscription ${id} not found`);
      }

      if (subscription.userId !== user.id) {
        // Warning log before throwing unauthorized error
        c.logger.warn('Unauthorized subscription cancellation attempt', {
          logType: 'operation',
          operationName: 'cancelSubscription',
          userId: user.id,
          resource: id,
        });
        throw createError.unauthorized('You do not have access to this subscription');
      }

      // Intermediate progress logging: canceling subscription in Stripe
      c.logger.info('Canceling subscription in Stripe', {
        logType: 'operation',
        operationName: 'cancelSubscription',
        userId: user.id,
        resource: id,
      });

      const canceledSubscription = await stripeService.cancelSubscription(
        id,
        body.cancelAtPeriodEnd,
      );

      // Update using batch.db for atomic operation
      await batch.db.update(tables.stripeSubscription)
        .set({
          status: canceledSubscription.status,
          cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
          canceledAt: canceledSubscription.canceled_at
            ? new Date(canceledSubscription.canceled_at * 1000)
            : null,
          updatedAt: new Date(),
        })
        .where(eq(tables.stripeSubscription.id, id));

      const updatedSubscription = await db.query.stripeSubscription.findFirst({
        where: eq(tables.stripeSubscription.id, id),
        with: {
          price: {
            columns: {
              productId: true,
            },
          },
        },
      });

      if (!updatedSubscription) {
        throw createError.internal('Failed to retrieve updated subscription');
      }

      // Success logging with cancellation details
      c.logger.info(`Subscription canceled successfully (cancelAtPeriodEnd: ${updatedSubscription.cancelAtPeriodEnd}, status: ${updatedSubscription.status})`, {
        logType: 'operation',
        operationName: 'cancelSubscription',
        userId: user.id,
        resource: id,
      });

      return Responses.ok(c, {
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status as 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'paused',
          priceId: updatedSubscription.priceId,
          productId: updatedSubscription.price.productId,
          currentPeriodStart: updatedSubscription.currentPeriodStart.toISOString(),
          currentPeriodEnd: updatedSubscription.currentPeriodEnd.toISOString(),
          cancelAtPeriodEnd: updatedSubscription.cancelAtPeriodEnd,
          canceledAt: updatedSubscription.canceledAt?.toISOString() || null,
          trialStart: updatedSubscription.trialStart?.toISOString() || null,
          trialEnd: updatedSubscription.trialEnd?.toISOString() || null,
        },
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
      c.logger.error('Failed to cancel subscription', error instanceof Error ? error : new Error(String(error)));
      throw createError.internal('Failed to cancel subscription');
    }
  },
);

// ============================================================================
// Webhook Handler
// ============================================================================

export const handleWebhookHandler: RouteHandler<typeof handleWebhookRoute, ApiEnv> = createHandlerWithBatch(
  {
    auth: 'public',
    operationName: 'handleStripeWebhook',
  },
  async (c, batch) => {
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      // Log missing signature attempt
      c.logger.warn('Webhook request missing stripe-signature header', {
        logType: 'operation',
        operationName: 'handleStripeWebhook',
      });
      throw createError.badRequest('Missing stripe-signature header');
    }

    // Operation start logging
    c.logger.info('Processing Stripe webhook', {
      logType: 'operation',
      operationName: 'handleStripeWebhook',
    });

    try {
      const db = await getDbAsync();

      const rawBody = await c.req.text();
      const event = stripeService.constructWebhookEvent(rawBody, signature);

      // Log successful signature verification
      c.logger.info('Webhook signature verified', {
        logType: 'operation',
        operationName: 'handleStripeWebhook',
        resource: `${event.type}-${event.id}`,
      });

      const existingEvent = await db.query.stripeWebhookEvent.findFirst({
        where: eq(tables.stripeWebhookEvent.id, event.id),
      });

      if (existingEvent?.processed) {
        // Log idempotent webhook (already processed)
        c.logger.info('Webhook event already processed (idempotent)', {
          logType: 'operation',
          operationName: 'handleStripeWebhook',
          resource: event.id,
        });

        return Responses.ok(c, {
          received: true,
          event: {
            id: event.id,
            type: event.type,
            processed: true,
          },
        });
      }

      // Insert webhook event using batch.db for atomic operation
      await batch.db.insert(tables.stripeWebhookEvent).values({
        id: event.id,
        type: event.type,
        data: event.data.object as unknown as Record<string, unknown>,
        processed: false,
        createdAt: new Date(event.created * 1000),
      }).onConflictDoNothing();

      // Process webhook event using batch.db
      await processWebhookEvent(event, batch.db);

      // Update webhook event as processed using batch.db
      await batch.db.update(tables.stripeWebhookEvent)
        .set({ processed: true })
        .where(eq(tables.stripeWebhookEvent.id, event.id));

      // Success logging with event type and ID
      c.logger.info('Webhook processed successfully', {
        logType: 'operation',
        operationName: 'handleStripeWebhook',
        resource: `${event.type}-${event.id}`,
      });

      return Responses.ok(c, {
        received: true,
        event: {
          id: event.id,
          type: event.type,
          processed: true,
        },
      });
    } catch (error) {
      // Error logging with proper Error instance
      c.logger.error('Webhook processing failed', error instanceof Error ? error : new Error(String(error)));
      throw createError.badRequest('Webhook processing failed');
    }
  },
);

// ============================================================================
// Webhook Event Processing
// ============================================================================

async function processWebhookEvent(
  event: Stripe.Event,
  db: Awaited<ReturnType<typeof getDbAsync>>,
): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscription(subscription, db);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      // Use batch.db for atomic operation
      await db.update(tables.stripeSubscription)
        .set({
          status: 'canceled',
          canceledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tables.stripeSubscription.id, subscription.id));
      break;
    }

    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await syncInvoice(invoice, db);
      break;
    }

    case 'customer.created':
    case 'customer.updated': {
      const customer = event.data.object as Stripe.Customer;
      await syncCustomer(customer, db);
      break;
    }

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      // When checkout is completed, the subscription is created automatically
      // We'll sync it when we receive customer.subscription.created event
      // Just log for now
      apiLogger.info('Checkout session completed', {
        logType: 'operation',
        operationName: 'webhookCheckoutCompleted',
        resource: session.id,
      });
      break;
    }

    case 'invoice.payment_action_required': {
      const invoice = event.data.object as Stripe.Invoice;
      // Sync invoice status - customer needs to take action
      await syncInvoice(invoice, db);
      apiLogger.warn('Invoice requires payment action', {
        logType: 'operation',
        operationName: 'webhookInvoiceActionRequired',
        resource: invoice.id,
      });
      break;
    }

    case 'customer.subscription.trial_will_end': {
      const subscription = event.data.object as Stripe.Subscription;
      // Log trial ending - application can send notification emails
      apiLogger.info('Subscription trial ending soon', {
        logType: 'operation',
        operationName: 'webhookTrialEnding',
        resource: subscription.id,
      });
      break;
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      apiLogger.info('Payment intent succeeded', {
        logType: 'operation',
        operationName: 'webhookPaymentSucceeded',
        resource: paymentIntent.id,
      });
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      apiLogger.warn('Payment intent failed', {
        logType: 'operation',
        operationName: 'webhookPaymentFailed',
        resource: paymentIntent.id,
      });
      break;
    }

    case 'customer.subscription.paused': {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscription(subscription, db);
      apiLogger.info('Subscription paused', {
        logType: 'operation',
        operationName: 'webhookSubscriptionPaused',
        resource: subscription.id,
      });
      break;
    }

    case 'customer.subscription.resumed': {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscription(subscription, db);
      apiLogger.info('Subscription resumed', {
        logType: 'operation',
        operationName: 'webhookSubscriptionResumed',
        resource: subscription.id,
      });
      break;
    }

    case 'customer.deleted': {
      const customer = event.data.object as Stripe.Customer;
      // Mark customer as deleted in database
      await db.update(tables.stripeCustomer)
        .set({ updatedAt: new Date() })
        .where(eq(tables.stripeCustomer.id, customer.id));
      apiLogger.info('Customer deleted', {
        logType: 'operation',
        operationName: 'webhookCustomerDeleted',
        resource: customer.id,
      });
      break;
    }

    default:
      // Log unhandled webhook events for monitoring
      apiLogger.debug('Unhandled webhook event type', {
        logType: 'operation',
        operationName: 'webhookUnhandled',
        resource: event.type,
      });
      break;
  }
}

async function syncSubscription(
  subscription: Stripe.Subscription,
  db: Awaited<ReturnType<typeof getDbAsync>>,
): Promise<void> {
  const firstItem = subscription.items.data[0];
  if (!firstItem) {
    throw createError.badRequest('Subscription has no items', {
      errorType: 'validation',
      fieldErrors: [{
        field: 'subscription.items',
        message: 'Subscription must have at least one item',
      }],
    });
  }

  const price = firstItem.price;
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const customer = await db.query.stripeCustomer.findFirst({
    where: eq(tables.stripeCustomer.id, customerId),
  });

  if (!customer) {
    throw createError.notFound(`Customer ${customerId} not found in database`, {
      errorType: 'database',
      operation: 'select',
      table: 'stripeCustomer',
    });
  }

  await db.insert(tables.stripeSubscription).values({
    id: subscription.id,
    userId: customer.userId,
    customerId: customer.id,
    priceId: price.id,
    status: subscription.status,
    quantity: firstItem.quantity ?? 1,
    currentPeriodStart: new Date((subscription as unknown as { current_period_start: number }).current_period_start * 1000),
    currentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    createdAt: new Date(subscription.created * 1000),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: tables.stripeSubscription.id,
    set: {
      status: subscription.status,
      quantity: firstItem.quantity ?? 1,
      currentPeriodStart: new Date((subscription as unknown as { current_period_start: number }).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      updatedAt: new Date(),
    },
  });
}

async function syncInvoice(
  invoice: Stripe.Invoice,
  db: Awaited<ReturnType<typeof getDbAsync>>,
): Promise<void> {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) {
    return;
  }

  const subscriptionId = (invoice as { subscription?: string | Stripe.Subscription }).subscription
    ? typeof (invoice as { subscription?: string | Stripe.Subscription }).subscription === 'string'
      ? (invoice as { subscription?: string | Stripe.Subscription }).subscription as string
      : ((invoice as { subscription?: string | Stripe.Subscription }).subscription as Stripe.Subscription).id
    : null;

  const isPaid = invoice.status === 'paid';

  await db.insert(tables.stripeInvoice).values({
    id: invoice.id,
    customerId,
    subscriptionId,
    status: invoice.status || 'draft',
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
    periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdf: invoice.invoice_pdf ?? null,
    paid: isPaid,
    attemptCount: invoice.attempt_count,
    createdAt: new Date(invoice.created * 1000),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: tables.stripeInvoice.id,
    set: {
      status: invoice.status || 'draft',
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
      periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdf: invoice.invoice_pdf ?? null,
      paid: isPaid,
      attemptCount: invoice.attempt_count,
      updatedAt: new Date(),
    },
  });
}

async function syncCustomer(
  customer: Stripe.Customer,
  db: Awaited<ReturnType<typeof getDbAsync>>,
): Promise<void> {
  const userId = customer.metadata?.userId;

  if (!userId || !customer.email) {
    return;
  }

  await db.insert(tables.stripeCustomer).values({
    id: customer.id,
    userId,
    email: customer.email,
    name: customer.name ?? null,
    createdAt: new Date(customer.created * 1000),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: tables.stripeCustomer.id,
    set: {
      email: customer.email,
      name: customer.name ?? null,
      updatedAt: new Date(),
    },
  });
}
