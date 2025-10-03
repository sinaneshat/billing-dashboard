/**
 * Stripe Data Synchronization Service
 *
 * Following Theo's "Stay Sane with Stripe" pattern:
 * https://github.com/t3dotgg/stay-sane-implementing-stripe
 *
 * Philosophy: Single source of truth for Stripe data sync
 * - ONE function that fetches ALL data from Stripe API
 * - Used by webhooks, success page, and manual sync
 * - Prevents race conditions and split brain issues
 * - Always fetches fresh data from Stripe API (never trust webhook payloads)
 */

import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

import { createError } from '@/api/common/error-handling';
import type { ErrorContext } from '@/api/core';
import { stripeService } from '@/api/services/stripe.service';
import { getDbAsync } from '@/db';
import * as tables from '@/db/schema';

/**
 * Synced subscription state type (similar to Theo's STRIPE_SUB_CACHE)
 */
export type SyncedSubscriptionState =
  | {
    status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'paused';
    subscriptionId: string;
    priceId: string;
    productId: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    canceledAt: number | null;
    trialStart: number | null;
    trialEnd: number | null;
    paymentMethod: {
      brand: string | null;
      last4: string | null;
    } | null;
  }
  | {
    status: 'none';
  };

/**
 * SINGLE SOURCE OF TRUTH: Sync Stripe Data to Database
 *
 * This function:
 * 1. Fetches latest data from Stripe API (NOT webhook payloads)
 * 2. Upserts to database
 * 3. Returns synced state
 *
 * Called by:
 * - All webhook events (customer.subscription.*, invoice.*, etc.)
 * - Success page after checkout
 * - Manual sync operations
 *
 * @param customerId - Stripe customer ID
 * @returns Synced subscription state
 */
export async function syncStripeDataFromStripe(
  customerId: string,
): Promise<SyncedSubscriptionState> {
  const db = await getDbAsync();

  // Verify customer exists in our database
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

  // Fetch latest subscription data from Stripe API (NOT webhook payload)
  const stripe = stripeService.getClient();
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: 'all',
    expand: ['data.default_payment_method', 'data.items.data.price.product'],
  });

  // No subscription exists
  if (subscriptions.data.length === 0) {
    return { status: 'none' };
  }

  // Get the latest subscription (user can only have one per Theo's recommendation)
  const subscription = subscriptions.data[0];

  if (!subscription) {
    return { status: 'none' };
  }

  // Extract subscription data
  const firstItem = subscription.items.data[0];
  if (!firstItem) {
    const context: ErrorContext = {
      errorType: 'external_service',
      service: 'stripe',
      operation: 'sync_subscription',
      resourceId: subscription.id,
    };
    throw createError.internal('Subscription has no items', context);
  }

  const price = firstItem.price;
  const product = typeof price.product === 'string' ? price.product : price.product?.id;

  if (!product) {
    const context: ErrorContext = {
      errorType: 'external_service',
      service: 'stripe',
      operation: 'sync_subscription',
      resourceId: price.id,
    };
    throw createError.internal('Price has no associated product', context);
  }

  // Extract payment method details
  let paymentMethod: { brand: string | null; last4: string | null } | null = null;
  if (subscription.default_payment_method && typeof subscription.default_payment_method !== 'string') {
    const pm = subscription.default_payment_method as Stripe.PaymentMethod;
    paymentMethod = {
      brand: pm.card?.brand ?? null,
      last4: pm.card?.last4 ?? null,
    };
  }

  // Extract period timestamps (these properties exist but are not in the base type)
  const subData = subscription as Stripe.Subscription & {
    current_period_start: number;
    current_period_end: number;
  };

  // Fetch recent invoices first (needed for batch operation)
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 10,
  });

  // Prepare subscription upsert operation
  const subscriptionUpsert = db.insert(tables.stripeSubscription).values({
    id: subscription.id,
    userId: customer.userId,
    customerId: customer.id,
    priceId: price.id,
    status: subscription.status,
    quantity: firstItem.quantity ?? 1,
    currentPeriodStart: new Date(subData.current_period_start * 1000),
    currentPeriodEnd: new Date(subData.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
    trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    metadata: subscription.metadata as Record<string, string> | null,
    createdAt: new Date(subscription.created * 1000),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: tables.stripeSubscription.id,
    set: {
      status: subscription.status,
      quantity: firstItem.quantity ?? 1,
      currentPeriodStart: new Date(subData.current_period_start * 1000),
      currentPeriodEnd: new Date(subData.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      metadata: subscription.metadata as Record<string, string> | null,
      updatedAt: new Date(),
    },
  });

  // Prepare invoice upsert operations
  const invoiceUpserts = invoices.data.map((invoice) => {
    // Extract subscription ID (can be string or Stripe.Subscription object or null)
    const invoiceData = invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    };
    const subscriptionId = invoiceData.subscription
      ? typeof invoiceData.subscription === 'string'
        ? invoiceData.subscription
        : invoiceData.subscription?.id ?? null
      : null;

    const isPaid = invoice.status === 'paid';

    return db.insert(tables.stripeInvoice).values({
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
  });

  // Execute all operations atomically using batch (Cloudflare D1 batch-first architecture)
  // For local development with SQLite, operations execute sequentially (acceptable for dev)
  if ('batch' in db && typeof db.batch === 'function') {
    // Cloudflare D1 - atomic batch execution
    await db.batch([subscriptionUpsert, ...invoiceUpserts]);
  } else {
    // Local SQLite fallback - execute sequentially
    await subscriptionUpsert;
    for (const invoiceUpsert of invoiceUpserts) {
      await invoiceUpsert;
    }
  }

  // Return synced subscription state (Theo's pattern)
  return {
    status: subscription.status,
    subscriptionId: subscription.id,
    priceId: price.id,
    productId: product,
    currentPeriodStart: subData.current_period_start,
    currentPeriodEnd: subData.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at ?? null,
    trialStart: subscription.trial_start ?? null,
    trialEnd: subscription.trial_end ?? null,
    paymentMethod,
  };
}

/**
 * Get customer ID from user ID
 * Helper for success page and other user-initiated syncs
 */
export async function getCustomerIdByUserId(userId: string): Promise<string | null> {
  const db = await getDbAsync();
  const customer = await db.query.stripeCustomer.findFirst({
    where: eq(tables.stripeCustomer.userId, userId),
  });
  return customer?.id ?? null;
}
