import type { RouteHandler } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

import { createError } from '@/api/common/error-handling';
import { createHandler, createHandlerWithBatch, Responses } from '@/api/core';
import { apiLogger } from '@/api/middleware/hono-logger';
import { stripeService } from '@/api/services/stripe.service';
import { getCustomerIdByUserId, syncStripeDataFromStripe } from '@/api/services/stripe-sync.service';
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
  syncAfterCheckoutRoute,
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
      const db = await getDbAsync();

      // Use Drizzle relational query to get products with prices
      const dbProducts = await db.query.stripeProduct.findMany({
        where: eq(tables.stripeProduct.active, true),
        with: {
          prices: {
            where: eq(tables.stripePrice.active, true),
          },
        },
      });

      const products = dbProducts.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        features: product.features,
        active: product.active,
        prices: product.prices.map(price => ({
          id: price.id,
          productId: price.productId,
          unitAmount: price.unitAmount || 0,
          currency: price.currency,
          interval: (price.interval || 'month') as 'month' | 'year',
          trialPeriodDays: price.trialPeriodDays,
          active: price.active,
        })),
      }));

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
      const db = await getDbAsync();

      // Use Drizzle relational query
      const dbProduct = await db.query.stripeProduct.findFirst({
        where: eq(tables.stripeProduct.id, id),
        with: {
          prices: {
            where: eq(tables.stripePrice.active, true),
          },
        },
      });

      if (!dbProduct) {
        c.logger.warn('Product not found', {
          logType: 'operation',
          operationName: 'getProduct',
          resource: id,
        });
        throw createError.notFound(`Product ${id} not found`);
      }

      const product = {
        id: dbProduct.id,
        name: dbProduct.name,
        description: dbProduct.description,
        features: dbProduct.features,
        active: dbProduct.active,
        prices: dbProduct.prices.map(price => ({
          id: price.id,
          productId: price.productId,
          unitAmount: price.unitAmount || 0,
          currency: price.currency,
          interval: (price.interval || 'month') as 'month' | 'year',
          trialPeriodDays: price.trialPeriodDays,
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
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
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

      // Use Drizzle relational query with nested relations
      const dbSubscriptions = await db.query.stripeSubscription.findMany({
        where: eq(tables.stripeSubscription.userId, user.id),
        with: {
          price: {
            with: {
              product: true,
            },
          },
        },
      });

      const subscriptions = dbSubscriptions.map(sub => ({
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
      // Use Drizzle relational query with nested relations
      const subscription = await db.query.stripeSubscription.findFirst({
        where: eq(tables.stripeSubscription.id, id),
        with: {
          price: {
            with: {
              product: true,
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

      // Fetch updated subscription using Drizzle relational query
      const updatedSubscription = await db.query.stripeSubscription.findFirst({
        where: eq(tables.stripeSubscription.id, id),
        with: {
          price: {
            with: {
              product: true,
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
// Sync Handler (Theo's Pattern: Eager Sync After Checkout)
// ============================================================================

/**
 * Sync Stripe Data After Checkout
 *
 * Following Theo's "Stay Sane with Stripe" pattern:
 * - Called immediately after user returns from Stripe Checkout
 * - Prevents race condition where user sees page before webhooks arrive
 * - Fetches fresh data from Stripe API (not webhook payload)
 * - Returns synced subscription state
 */
export const syncAfterCheckoutHandler: RouteHandler<typeof syncAfterCheckoutRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'syncAfterCheckout',
  },
  async (c) => {
    const user = c.get('user');

    if (!user) {
      throw createError.unauthenticated('Valid session required for sync');
    }

    c.logger.info('Syncing Stripe data after checkout', {
      logType: 'operation',
      operationName: 'syncAfterCheckout',
      userId: user.id,
    });

    try {
      // Get customer ID from user ID
      const customerId = await getCustomerIdByUserId(user.id);

      if (!customerId) {
        c.logger.warn('No Stripe customer found for user', {
          logType: 'operation',
          operationName: 'syncAfterCheckout',
          userId: user.id,
        });

        throw createError.notFound('No Stripe customer found for user');
      }

      // Eagerly sync data from Stripe API (Theo's pattern)
      const syncedState = await syncStripeDataFromStripe(customerId);

      c.logger.info('Stripe data synced successfully', {
        logType: 'operation',
        operationName: 'syncAfterCheckout',
        userId: user.id,
        resource: syncedState.status !== 'none' ? syncedState.subscriptionId : 'none',
      });

      return Responses.ok(c, {
        synced: true,
        subscription: syncedState.status !== 'none'
          ? {
              status: syncedState.status,
              subscriptionId: syncedState.subscriptionId,
            }
          : null,
      });
    } catch (error) {
      c.logger.error('Failed to sync Stripe data', error instanceof Error ? error : new Error(String(error)));
      throw createError.internal('Failed to sync Stripe data');
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
// Webhook Event Processing (Theo's Pattern)
// ============================================================================

/**
 * List of webhook events to track (from Theo's guide)
 * All events trigger the SAME sync function - no need for event-specific logic
 */
const TRACKED_WEBHOOK_EVENTS: Stripe.Event.Type[] = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'customer.subscription.pending_update_applied',
  'customer.subscription.pending_update_expired',
  'customer.subscription.trial_will_end',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'invoice.upcoming',
  'invoice.marked_uncollectible',
  'invoice.payment_succeeded',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
];

/**
 * Extract customer ID from webhook event
 * All tracked events have a customer property
 */
function extractCustomerId(event: Stripe.Event): string | null {
  const obj = event.data.object as { customer?: string | { id: string } };

  if (!obj.customer)
    return null;

  return typeof obj.customer === 'string' ? obj.customer : obj.customer.id;
}

/**
 * Process Webhook Event (Theo's Simplified Pattern)
 *
 * Philosophy:
 * - Don't trust webhook payloads (can be stale or incomplete)
 * - Extract customerId only
 * - Call single sync function that fetches fresh data from Stripe API
 * - No event-specific logic needed
 */
async function processWebhookEvent(
  event: Stripe.Event,
  db: Awaited<ReturnType<typeof getDbAsync>>,
): Promise<void> {
  // Skip if event type not tracked
  if (!TRACKED_WEBHOOK_EVENTS.includes(event.type)) {
    apiLogger.info('Skipping untracked webhook event', {
      logType: 'operation',
      operationName: 'webhookSkipped',
      resource: `${event.type}-${event.id}`,
    });
    return;
  }

  // Extract customer ID
  const customerId = extractCustomerId(event);

  if (!customerId) {
    apiLogger.warn('Webhook event missing customer ID', {
      logType: 'operation',
      operationName: 'webhookMissingCustomer',
      resource: `${event.type}-${event.id}`,
    });
    return;
  }

  // Verify customer exists in our database
  const customer = await db.query.stripeCustomer.findFirst({
    where: eq(tables.stripeCustomer.id, customerId),
  });

  if (!customer) {
    apiLogger.warn('Webhook event for unknown customer', {
      logType: 'operation',
      operationName: 'webhookUnknownCustomer',
      resource: `${event.type}-${customerId}`,
    });
    return;
  }

  // Single sync function - fetches fresh data from Stripe API (Theo's pattern)
  await syncStripeDataFromStripe(customerId);

  apiLogger.info('Webhook event processed via sync', {
    logType: 'operation',
    operationName: 'webhookSynced',
    resource: `${event.type}-${customerId}`,
  });
}
