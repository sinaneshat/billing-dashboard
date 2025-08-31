/**
 * Monthly Billing Cron Job Handler
 * Processes recurring subscriptions with ZarinPal Direct Debit
 * Runs monthly to charge active subscriptions
 */

import { and, eq, isNull, lte } from 'drizzle-orm';

import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { payment, subscription } from '@/db/tables/billing';
import type { ZarinPalService } from '@/services/zarinpal';
import { createZarinPalService } from '@/services/zarinpal';

type BillingResult = {
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
};

/**
 * Process monthly billing for all due subscriptions
 * This function is called by the Cloudflare cron trigger
 */
export async function processMonthlyBilling(env: ApiEnv): Promise<BillingResult> {
  const result: BillingResult = {
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [],
  };

  console.log('Starting monthly billing process...');

  try {
    // Get all active monthly subscriptions that are due for billing
    const currentDate = new Date();
    const dueSubscriptions = await db
      .select()
      .from(subscription)
      .where(
        and(
          eq(subscription.status, 'active'),
          eq(subscription.billingPeriod, 'monthly'),
          lte(subscription.nextBillingDate!, currentDate), // Due for billing
          isNull(subscription.endDate), // Not canceled
        ),
      );

    console.log(`Found ${dueSubscriptions.length} subscriptions due for billing`);

    if (dueSubscriptions.length === 0) {
      return result;
    }

    const zarinPal = createZarinPalService({
      merchantId: env.Bindings.ZARINPAL_MERCHANT_ID,
      accessToken: env.Bindings.ZARINPAL_ACCESS_TOKEN,
    });

    // Process each subscription
    for (const sub of dueSubscriptions) {
      result.processed++;

      try {
        await processSingleSubscription(sub, zarinPal, result);
      } catch (error) {
        result.failed++;
        const errorMessage = `Subscription ${sub.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMessage);
        console.error(errorMessage);

        // Update subscription with failed billing attempt
        await handleSubscriptionBillingFailure(sub.id, errorMessage);
      }
    }

    console.log('Monthly billing process completed:', result);
    return result;
  } catch (error) {
    const errorMessage = `Monthly billing process failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMessage);
    console.error(errorMessage);
    return result;
  }
}

/**
 * Process billing for a single subscription
 */
async function processSingleSubscription(
  sub: typeof subscription.$inferSelect,
  zarinPal: ZarinPalService,
  result: BillingResult,
) {
  // Check if subscription has direct debit token
  if (!sub.zarinpalDirectDebitToken) {
    throw new Error('No direct debit token available');
  }

  // Check for existing pending payment for this subscription
  const existingPendingPayments = await db
    .select()
    .from(payment)
    .where(
      and(
        eq(payment.subscriptionId, sub.id),
        eq(payment.status, 'pending'),
      ),
    );

  if (existingPendingPayments.length > 0) {
    throw new Error('Pending payment already exists');
  }

  // Check retry count for failed payments
  const failedPaymentsToday = await db
    .select()
    .from(payment)
    .where(
      and(
        eq(payment.subscriptionId, sub.id),
        eq(payment.status, 'failed'),
        lte(payment.nextRetryAt!, new Date()),
      ),
    );

  // Determine retry count
  let retryCount = 0;
  let existingFailedPayment = null;

  if (failedPaymentsToday.length > 0) {
    // Use the most recent failed payment for retry logic
    existingFailedPayment = failedPaymentsToday.sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0),
    )[0]!;
    retryCount = existingFailedPayment.retryCount || 0;

    if (retryCount >= (existingFailedPayment.maxRetries || 3)) {
      // Max retries reached, suspend subscription
      await db
        .update(subscription)
        .set({
          status: 'expired',
          endDate: new Date(),
        })
        .where(eq(subscription.id, sub.id));

      throw new Error(`Max retries (${existingFailedPayment.maxRetries}) reached, subscription suspended`);
    }
  }

  // Create payment record
  const paymentId = crypto.randomUUID();
  const paymentRecord = {
    id: paymentId,
    userId: sub.userId,
    subscriptionId: sub.id,
    productId: sub.productId,
    amount: sub.currentPrice,
    status: 'pending' as const,
    paymentMethod: 'zarinpal',
    zarinpalDirectDebitUsed: true,
    retryCount,
    maxRetries: 3,
  };

  if (existingFailedPayment) {
    // Update existing payment record for retry
    await db
      .update(payment)
      .set({
        ...paymentRecord,
        retryCount: retryCount + 1,
        nextRetryAt: null, // Clear retry timestamp
      })
      .where(eq(payment.id, existingFailedPayment.id));
  } else {
    // Create new payment record
    await db.insert(payment).values(paymentRecord);
  }

  try {
    // Process Direct Debit payment with ZarinPal
    const directDebitResult = await zarinPal.directDebitPayment({
      amount: sub.currentPrice,
      currency: 'IRR' as const,
      description: `Monthly subscription billing - ${new Date().toLocaleDateString('en-US')}`,
      card_hash: sub.zarinpalDirectDebitToken,
      metadata: {
        subscriptionId: sub.id,
        paymentId,
        billingCycle: 'monthly',
        isAutomaticBilling: true,
      },
    });

    if (directDebitResult.data?.code === 100) {
      // Payment successful
      await db
        .update(payment)
        .set({
          status: 'completed',
          zarinpalRefId: directDebitResult.data?.ref_id?.toString(),
          paidAt: new Date(),
        })
        .where(eq(payment.id, paymentId));

      // Update subscription for next billing cycle
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      await db
        .update(subscription)
        .set({
          nextBillingDate,
        })
        .where(eq(subscription.id, sub.id));

      result.successful++;
      console.log(`✅ Subscription ${sub.id} billed successfully`);
    } else {
      // Payment failed
      const nextRetryAt = calculateNextRetryTime(retryCount + 1);

      await db
        .update(payment)
        .set({
          status: 'failed',
          failureReason: directDebitResult.data?.message || 'Direct debit payment failed',
          failedAt: new Date(),
          nextRetryAt,
        })
        .where(eq(payment.id, paymentId));

      result.failed++;
      throw new Error(`ZarinPal Direct Debit failed: ${directDebitResult.data?.message || 'Unknown error'}`);
    }
  } catch (error) {
    // Handle payment processing error
    const nextRetryAt = calculateNextRetryTime(retryCount + 1);

    await db
      .update(payment)
      .set({
        status: 'failed',
        failureReason: error instanceof Error ? error.message : 'Unknown payment error',
        failedAt: new Date(),
        nextRetryAt,
      })
      .where(eq(payment.id, paymentId));

    throw error;
  }
}

/**
 * Handle subscription billing failure
 */
async function handleSubscriptionBillingFailure(subscriptionId: string, errorMessage: string) {
  try {
    // Get current failure count from metadata
    const subData = await db
      .select()
      .from(subscription)
      .where(eq(subscription.id, subscriptionId))
      .limit(1);

    if (subData.length === 0)
      return;

    const sub = subData[0]!;
    const metadata = (sub.metadata as Record<string, unknown>) || {};
    const failureCount = ((metadata.billingFailureCount as number) || 0) + 1;

    // Update subscription metadata
    await db
      .update(subscription)
      .set({
        metadata: {
          ...metadata,
          billingFailureCount: failureCount,
          lastBillingError: errorMessage,
          lastBillingErrorAt: new Date().toISOString(),
        },
      })
      .where(eq(subscription.id, subscriptionId));

    // If too many failures, suspend subscription
    if (failureCount >= 5) {
      await db
        .update(subscription)
        .set({
          status: 'expired',
          endDate: new Date(),
        })
        .where(eq(subscription.id, subscriptionId));

      console.log(`🚫 Subscription ${subscriptionId} suspended due to repeated billing failures`);
    }
  } catch (error) {
    console.error('Failed to handle subscription billing failure:', error);
  }
}

/**
 * Calculate next retry time with exponential backoff
 */
function calculateNextRetryTime(retryCount: number): Date {
  const backoffMinutes = Math.min(2 ** retryCount * 60, 24 * 60); // Max 24 hours
  const nextRetry = new Date();
  nextRetry.setMinutes(nextRetry.getMinutes() + backoffMinutes);
  return nextRetry;
}

/**
 * Scheduled event handler for Cloudflare Workers cron trigger
 */
export default {
  async scheduled(event: ScheduledEvent, env: ApiEnv, ctx: ExecutionContext): Promise<void> {
    console.log('🔄 Monthly billing cron job triggered:', event.cron);

    ctx.waitUntil((async () => {
      try {
        const result = await processMonthlyBilling(env);

        // Log results for monitoring
        console.log('📊 Monthly billing results:', {
          timestamp: new Date().toISOString(),
          cron: event.cron,
          ...result,
        });

        // Could optionally send results to external monitoring service
        if (env.Bindings.EXTERNAL_WEBHOOK_URL && (result.failed > 0 || result.errors.length > 0)) {
          try {
            await fetch(env.Bindings.EXTERNAL_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                source: 'monthly-billing-cron',
                timestamp: new Date().toISOString(),
                summary: result,
                alert: result.failed > 0 ? 'billing_failures' : null,
              }),
            });
          } catch (webhookError) {
            console.error('Failed to send billing report to external webhook:', webhookError);
          }
        }
      } catch (error) {
        console.error('❌ Monthly billing cron job failed:', error);
      }
    })());
  },
};
