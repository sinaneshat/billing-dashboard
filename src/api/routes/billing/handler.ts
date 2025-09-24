/**
 * Billing Operations Handler - Recurring Payments & Metrics
 *
 * Handles automated billing operations including:
 * - Recurring payment processing for direct debit subscriptions
 * - Billing metrics and monitoring
 * - Subscription lifecycle management
 */

import type { RouteHandler } from '@hono/zod-openapi';
import { and, count, eq, gte, isNotNull, lte, sum } from 'drizzle-orm';

import { createError } from '@/api/common/error-handling';
import type { HandlerContext } from '@/api/core';
import { createHandler, Responses } from '@/api/core';
import { convertUsdToRial } from '@/api/services/unified-currency-service';
import { ZarinPalDirectDebitService } from '@/api/services/zarinpal-direct-debit';
import type { ApiEnv } from '@/api/types';
import { decryptSignature } from '@/api/utils/crypto';
import { getDbAsync } from '@/db';
import { user } from '@/db/tables/auth';
import { billingEvent, payment, paymentMethod, product, subscription, webhookEvent } from '@/db/tables/billing';

import type { getBillingMetricsRoute, processRecurringPaymentsRoute } from './route';

// ============================================================================
// RECURRING PAYMENT PROCESSING
// ============================================================================

type RecurringPaymentResult = {
  subscriptionId: string;
  userId: string;
  status: 'success' | 'failed' | 'skipped';
  amount?: number;
  reason?: string;
};

type SubscriptionRow = {
  subscription: typeof subscription.$inferSelect;
  product: typeof product.$inferSelect;
  paymentMethod: typeof paymentMethod.$inferSelect;
  user: typeof user.$inferSelect;
};

// ============================================================================
// HELPER FUNCTIONS FOR BILLING PROCESSING
// ============================================================================

/**
 * Check if subscription was already processed today
 */
async function checkAlreadyProcessedToday(
  db: Awaited<ReturnType<typeof getDbAsync>>,
  subscriptionId: string,
  today: Date,
): Promise<boolean> {
  const existingPaymentToday = await db
    .select()
    .from(payment)
    .where(
      and(
        eq(payment.subscriptionId, subscriptionId),
        eq(payment.status, 'completed'),
        gte(payment.createdAt, new Date(today.getFullYear(), today.getMonth(), today.getDate())),
      ),
    )
    .limit(1);

  return existingPaymentToday.length > 0;
}

/**
 * Validate contract and transaction limits
 */
async function validateContractAndLimits(
  db: Awaited<ReturnType<typeof getDbAsync>>,
  paymentMethodRecord: typeof paymentMethod.$inferSelect,
  amountInRials: number,
  userId: string,
  today: Date,
): Promise<void> {
  // Contract expiration monitoring
  if (paymentMethodRecord.contractExpiresAt && paymentMethodRecord.contractExpiresAt <= today) {
    await db.update(paymentMethod)
      .set({
        contractStatus: 'expired',
        isActive: false,
      })
      .where(eq(paymentMethod.id, paymentMethodRecord.id));

    await db.insert(billingEvent).values({
      userId,
      paymentMethodId: paymentMethodRecord.id,
      eventType: 'contract_expired',
      eventData: {
        contractExpiresAt: paymentMethodRecord.contractExpiresAt.toISOString(),
        expiredOn: today.toISOString(),
        contractDisplayName: paymentMethodRecord.contractDisplayName,
      },
      severity: 'warning',
    });

    throw createError.badRequest(
      `Direct debit contract expired on ${paymentMethodRecord.contractExpiresAt.toLocaleDateString('fa-IR')}. Please create a new contract to continue billing.`,
    );
  }

  // Transaction amount limits
  if (paymentMethodRecord.maxTransactionAmount && amountInRials > paymentMethodRecord.maxTransactionAmount) {
    throw createError.badRequest(
      `Transaction amount (${(amountInRials / 10).toLocaleString('fa-IR')} Toman) exceeds contract maximum transaction limit (${(paymentMethodRecord.maxTransactionAmount / 10).toLocaleString('fa-IR')} Toman)`,
    );
  }

  // Daily limits validation
  await validateDailyLimits(db, paymentMethodRecord, amountInRials, userId, today);

  // Monthly limits validation
  if (paymentMethodRecord.maxMonthlyCount) {
    await validateMonthlyLimits(db, paymentMethodRecord, userId, today);
  }
}

/**
 * Validate daily transaction limits
 */
async function validateDailyLimits(
  db: Awaited<ReturnType<typeof getDbAsync>>,
  paymentMethodRecord: typeof paymentMethod.$inferSelect,
  amountInRials: number,
  userId: string,
  today: Date,
): Promise<void> {
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const dailyPayments = await db
    .select({
      totalAmount: sum(payment.amount),
      transactionCount: count(payment.id),
    })
    .from(payment)
    .where(
      and(
        eq(payment.userId, userId),
        eq(payment.status, 'completed'),
        gte(payment.createdAt, startOfDay),
        lte(payment.createdAt, endOfDay),
      ),
    );

  const dailyTotal = Number(dailyPayments[0]?.totalAmount || 0);
  const dailyCount = Number(dailyPayments[0]?.transactionCount || 0);

  if (paymentMethodRecord.maxDailyAmount && (dailyTotal + amountInRials) > paymentMethodRecord.maxDailyAmount) {
    throw createError.badRequest(
      `Transaction would exceed daily amount limit. Current: ${(dailyTotal / 10).toLocaleString('fa-IR')} Toman, Limit: ${(paymentMethodRecord.maxDailyAmount / 10).toLocaleString('fa-IR')} Toman`,
    );
  }

  if (paymentMethodRecord.maxDailyCount && (dailyCount + 1) > paymentMethodRecord.maxDailyCount) {
    throw createError.badRequest(
      `Transaction would exceed daily transaction count limit. Current: ${dailyCount}, Limit: ${paymentMethodRecord.maxDailyCount}`,
    );
  }
}

/**
 * Validate monthly transaction limits
 */
async function validateMonthlyLimits(
  db: Awaited<ReturnType<typeof getDbAsync>>,
  paymentMethodRecord: typeof paymentMethod.$inferSelect,
  userId: string,
  today: Date,
): Promise<void> {
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);

  const monthlyPayments = await db
    .select({
      transactionCount: count(payment.id),
    })
    .from(payment)
    .where(
      and(
        eq(payment.userId, userId),
        eq(payment.status, 'completed'),
        gte(payment.createdAt, startOfMonth),
        lte(payment.createdAt, endOfMonth),
      ),
    );

  const monthlyCount = Number(monthlyPayments[0]?.transactionCount || 0);

  if (paymentMethodRecord.maxMonthlyCount && (monthlyCount + 1) > paymentMethodRecord.maxMonthlyCount) {
    throw createError.badRequest(
      `Transaction would exceed monthly transaction count limit. Current: ${monthlyCount}, Limit: ${paymentMethodRecord.maxMonthlyCount}`,
    );
  }
}

/**
 * Process successful payment
 */
async function processSuccessfulPayment(
  db: Awaited<ReturnType<typeof getDbAsync>>,
  c: HandlerContext<ApiEnv>,
  subscriptionData: SubscriptionRow,
  paymentId: string,
  amountInRials: number,
  refId: string,
  today: Date,
): Promise<void> {
  const { subscription: sub, user: userRecord } = subscriptionData;

  // Update payment status
  await db.update(payment)
    .set({
      status: 'completed',
      zarinpalRefId: refId,
      paidAt: new Date(),
    })
    .where(eq(payment.id, paymentId));

  // Update subscription billing cycle
  const nextBillingDate = new Date(today);
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  await db.update(subscription)
    .set({
      billingCycleCount: (sub.billingCycleCount || 0) + 1,
      lastBillingAttempt: new Date(),
      nextBillingDate,
      failedBillingAttempts: 0,
    })
    .where(eq(subscription.id, sub.id));

  // Log billing event
  await db.insert(billingEvent).values({
    userId: sub.userId,
    subscriptionId: sub.id,
    paymentId,
    paymentMethodId: subscriptionData.paymentMethod.id,
    eventType: 'recurring_payment_success',
    eventData: {
      amount: amountInRials,
      refId,
      billingCycle: (sub.billingCycleCount || 0) + 1,
      nextBillingDate: nextBillingDate.toISOString(),
    },
    severity: 'info',
  });

  // Dispatch Roundtable webhook
  try {
    await dispatchSuccessWebhook(subscriptionData, paymentId, amountInRials, refId, userRecord);
  } catch (webhookError) {
    c.logger.error('Failed to dispatch Roundtable webhook for recurring payment', webhookError instanceof Error ? webhookError : new Error(String(webhookError)));
  }
}

/**
 * Process failed payment
 */
async function processFailedPayment(
  db: Awaited<ReturnType<typeof getDbAsync>>,
  c: HandlerContext<ApiEnv>,
  subscriptionData: SubscriptionRow,
  paymentId: string,
  amountInRials: number,
  failureReason: string,
  today: Date,
): Promise<void> {
  const { subscription: sub, user: userRecord } = subscriptionData;
  const maxFailedAttempts = 3;

  // Update payment status
  await db.update(payment)
    .set({
      status: 'failed',
      failureReason,
      failedAt: new Date(),
    })
    .where(eq(payment.id, paymentId));

  // Update subscription with failed billing attempt
  const failedAttempts = (sub.failedBillingAttempts || 0) + 1;

  type SubscriptionUpdate = {
    lastBillingAttempt: Date;
    failedBillingAttempts: number;
    status?: 'active' | 'canceled' | 'expired' | 'pending';
    endDate?: Date | null;
    cancellationReason?: string | null;
    nextBillingDate?: Date | null;
  };

  const subscriptionUpdate: SubscriptionUpdate = {
    lastBillingAttempt: new Date(),
    failedBillingAttempts: failedAttempts,
  };

  if (failedAttempts >= maxFailedAttempts) {
    subscriptionUpdate.status = 'canceled';
    subscriptionUpdate.endDate = new Date();
    subscriptionUpdate.cancellationReason = `Payment failed ${maxFailedAttempts} times`;
    subscriptionUpdate.nextBillingDate = null;
  } else {
    const retryDate = new Date(today);
    retryDate.setDate(retryDate.getDate() + 3);
    subscriptionUpdate.nextBillingDate = retryDate;
  }

  await db.update(subscription)
    .set(subscriptionUpdate)
    .where(eq(subscription.id, sub.id));

  // Log billing event
  await db.insert(billingEvent).values({
    userId: sub.userId,
    subscriptionId: sub.id,
    paymentId,
    paymentMethodId: subscriptionData.paymentMethod.id,
    eventType: failedAttempts >= maxFailedAttempts ? 'subscription_cancelled_payment_failure' : 'recurring_payment_failed',
    eventData: {
      amount: amountInRials,
      failureReason,
      failedAttempts,
      subscriptionCanceled: failedAttempts >= maxFailedAttempts,
    },
    severity: failedAttempts >= maxFailedAttempts ? 'critical' : 'warning',
  });

  // Dispatch failure webhook
  try {
    await dispatchFailureWebhook(subscriptionData, paymentId, amountInRials, failureReason, failedAttempts, maxFailedAttempts, userRecord);
  } catch (webhookError) {
    c.logger.error('Failed to dispatch Roundtable webhook for failed payment', webhookError instanceof Error ? webhookError : new Error(String(webhookError)));
  }
}

/**
 * Dispatch success webhook to Roundtable using existing webhook system
 */
async function dispatchSuccessWebhook(
  subscriptionData: SubscriptionRow,
  paymentId: string,
  amountInRials: number,
  refId: string,
  userRecord: typeof user.$inferSelect,
): Promise<void> {
  const { WebhookEventBuilders, RoundtableWebhookForwarder } = await import('@/api/routes/webhooks/handler');
  const { subscription: sub, product: prod } = subscriptionData;

  // Use existing customer ID generation based on user email (not user ID)
  const customerId = WebhookEventBuilders.generateVirtualStripeCustomerId(userRecord.email);

  // Generate proper invoice ID using existing pattern
  const invoiceId = `in_${WebhookEventBuilders.generateEventId().replace('evt_', '')}`;

  const invoiceEvent = WebhookEventBuilders.createInvoicePaymentSucceededEvent(
    invoiceId,
    customerId,
    sub.id,
    amountInRials,
    {
      userEmail: userRecord.email,
      roundtableProductId: prod.roundtableId || prod.id,
      productName: prod.name,
      planName: (prod.metadata as Record<string, unknown>)?.roundtable_plan_name as string || prod.name || 'Pro',
      billingUserId: sub.userId,
      paymentId,
      zarinpalRefId: refId,
      billingCycle: ((sub.billingCycleCount || 0) + 1).toString(),
      recurringPayment: 'true',
    },
  );

  await RoundtableWebhookForwarder.forwardEvent(invoiceEvent);
}

/**
 * Dispatch failure webhook to Roundtable using existing webhook system
 */
async function dispatchFailureWebhook(
  subscriptionData: SubscriptionRow,
  paymentId: string,
  amountInRials: number,
  failureReason: string,
  failedAttempts: number,
  maxFailedAttempts: number,
  userRecord: typeof user.$inferSelect,
): Promise<void> {
  const { WebhookEventBuilders, RoundtableWebhookForwarder } = await import('@/api/routes/webhooks/handler');
  const { subscription: sub, product: prod } = subscriptionData;

  // Use existing customer ID generation based on user email (not user ID)
  const customerId = WebhookEventBuilders.generateVirtualStripeCustomerId(userRecord.email);

  if (failedAttempts >= maxFailedAttempts) {
    // Send subscription cancellation event
    const subscriptionDeletedEvent = WebhookEventBuilders.createCustomerSubscriptionDeletedEvent(
      sub.id,
      customerId,
      {
        userEmail: userRecord.email,
        roundtableProductId: prod.roundtableId || prod.id,
        productName: prod.name,
        planName: (prod.metadata as Record<string, unknown>)?.roundtable_plan_name as string || prod.name || 'Pro',
        billingUserId: sub.userId,
        cancellationReason: `Payment failed ${maxFailedAttempts} times`,
        canceledAt: new Date().toISOString(),
      },
    );
    await RoundtableWebhookForwarder.forwardEvent(subscriptionDeletedEvent);
  } else {
    // Send invoice payment failed event
    const invoiceId = `in_${WebhookEventBuilders.generateEventId().replace('evt_', '')}`;
    const invoiceFailedEvent = WebhookEventBuilders.createInvoicePaymentFailedEvent(
      invoiceId,
      customerId,
      sub.id,
      amountInRials,
      failureReason,
      {
        userEmail: userRecord.email,
        roundtableProductId: prod.roundtableId || prod.id,
        productName: prod.name,
        planName: (prod.metadata as Record<string, unknown>)?.roundtable_plan_name as string || prod.name || 'Pro',
        billingUserId: sub.userId,
        paymentId,
        failedAttempts: failedAttempts.toString(),
        recurringPayment: 'true',
      },
    );
    await RoundtableWebhookForwarder.forwardEvent(invoiceFailedEvent);
  }
}

/**
 * Process recurring payments for subscriptions with direct debit contracts
 * This endpoint should be called by a cron job (Cloudflare Cron Triggers)
 * Simplified with helper functions for better maintainability
 */
export const processRecurringPaymentsHandler: RouteHandler<typeof processRecurringPaymentsRoute, ApiEnv> = createHandler(
  {
    auth: 'api-key', // API key authentication for cron jobs
    operationName: 'processRecurringPayments',
  },
  async (c) => {
    const db = await getDbAsync();
    const today = new Date();

    c.logger.info('Starting recurring payments processing', {
      logType: 'operation',
      operationName: 'processRecurringPayments',
      resource: `date:${today.toISOString()}`,
    });

    // Find subscriptions due for billing today
    const dueSubscriptions = await db
      .select({
        subscription,
        product,
        paymentMethod,
        user,
      })
      .from(subscription)
      .innerJoin(product, eq(subscription.productId, product.id))
      .innerJoin(paymentMethod, eq(subscription.paymentMethodId, paymentMethod.id))
      .innerJoin(user, eq(subscription.userId, user.id))
      .where(
        and(
          eq(subscription.status, 'active'),
          eq(subscription.billingPeriod, 'monthly'), // Only monthly recurring
          isNotNull(subscription.nextBillingDate),
          lte(subscription.nextBillingDate, today), // Due today or overdue
          eq(paymentMethod.contractStatus, 'active'), // Active direct debit contract
          eq(product.isActive, true),
        ),
      );

    const results: RecurringPaymentResult[] = [];
    let successfulPayments = 0;
    let failedPayments = 0;
    let skippedSubscriptions = 0;

    for (const subscriptionRow of dueSubscriptions) {
      try {
        // Skip if already processed today
        const alreadyProcessed = await checkAlreadyProcessedToday(db, subscriptionRow.subscription.id, today);
        if (alreadyProcessed) {
          results.push({
            subscriptionId: subscriptionRow.subscription.id,
            userId: subscriptionRow.subscription.userId,
            status: 'skipped',
            reason: 'Already processed today',
          });
          skippedSubscriptions++;
          continue;
        }

        // Calculate amount in IRR using unified currency service
        const conversionResult = await convertUsdToRial(subscriptionRow.product.price);
        const amountInRials = Math.round(conversionResult.rialPrice);

        // Create payment record (database generates ID)
        const paymentData = {
          userId: subscriptionRow.subscription.userId,
          subscriptionId: subscriptionRow.subscription.id,
          productId: subscriptionRow.product.id,
          amount: amountInRials,
          currency: 'IRR' as const,
          status: 'pending' as const,
          paymentMethod: 'zarinpal',
          zarinpalDirectDebitUsed: true,
        };

        const result = await db.insert(payment).values(paymentData).returning();
        if (!result[0]) {
          throw createError.internal('Failed to create payment record');
        }
        const newPayment = result[0];
        const paymentId = newPayment.id;

        // Validate contract signature exists
        if (!subscriptionRow.paymentMethod.contractSignatureEncrypted) {
          throw createError.badRequest('Payment method has no valid contract signature');
        }

        // Validate contract status and transaction limits
        await validateContractAndLimits(
          db,
          subscriptionRow.paymentMethod,
          amountInRials,
          subscriptionRow.subscription.userId,
          today,
        );

        // Process payment with ZarinPal Direct Debit
        const decryptedSignature = await decryptSignature(subscriptionRow.paymentMethod.contractSignatureEncrypted);
        const zarinPalDirectDebit = ZarinPalDirectDebitService.create(c.env);

        const directDebitResult = await zarinPalDirectDebit.chargeDirectDebit({
          amount: amountInRials,
          currency: 'IRR',
          description: `Monthly subscription to ${subscriptionRow.product.name}`,
          contractSignature: decryptedSignature,
          metadata: {
            subscriptionId: subscriptionRow.subscription.id,
            paymentId,
            userId: subscriptionRow.subscription.userId,
            productId: subscriptionRow.product.id,
            type: 'subscription',
            billingCycle: 'monthly',
          },
        });

        if (directDebitResult.success && directDebitResult.data?.refId) {
          // Payment succeeded - use helper function
          await processSuccessfulPayment(
            db,
            c,
            subscriptionRow,
            paymentId,
            amountInRials,
            directDebitResult.data.refId.toString(),
            today,
          );

          results.push({
            subscriptionId: subscriptionRow.subscription.id,
            userId: subscriptionRow.subscription.userId,
            status: 'success',
            amount: amountInRials,
          });
          successfulPayments++;
        } else {
          // Payment failed - use helper function
          const failureReason = directDebitResult.error || 'Direct debit payment failed';

          await processFailedPayment(
            db,
            c,
            subscriptionRow,
            paymentId,
            amountInRials,
            failureReason,
            today,
          );

          results.push({
            subscriptionId: subscriptionRow.subscription.id,
            userId: subscriptionRow.subscription.userId,
            status: 'failed',
            amount: amountInRials,
            reason: failureReason,
          });
          failedPayments++;
        }
      } catch (error) {
        c.logger.error(
          `Error processing recurring payment for subscription ${subscriptionRow.subscription.id}`,
          error instanceof Error ? error : new Error(String(error)),
        );

        results.push({
          subscriptionId: subscriptionRow.subscription.id,
          userId: subscriptionRow.subscription.userId,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
        failedPayments++;
      }
    }

    c.logger.info(`Recurring payments processing completed: ${successfulPayments} successful, ${failedPayments} failed, ${skippedSubscriptions} skipped`, {
      logType: 'operation',
      operationName: 'processRecurringPayments',
      resource: `processed:${results.length}`,
    });

    return Responses.ok(c, {
      processedCount: results.length,
      successfulPayments,
      failedPayments,
      skippedSubscriptions,
      details: results,
    });
  },
);

// ============================================================================
// BILLING METRICS
// ============================================================================

/**
 * Get billing metrics for monitoring and analytics
 */
export const getBillingMetricsHandler: RouteHandler<typeof getBillingMetricsRoute, ApiEnv> = createHandler(
  {
    auth: 'api-key', // API key authentication for monitoring
    operationName: 'getBillingMetrics',
  },
  async (c) => {
    const db = await getDbAsync();

    c.logger.info('Fetching billing metrics', {
      logType: 'operation',
      operationName: 'getBillingMetrics',
    });

    try {
      // Subscription metrics
      const [
        totalSubscriptions,
        activeSubscriptions,
        pendingSubscriptions,
        canceledSubscriptions,
        dueTodaySubscriptions,
      ] = await Promise.all([
        db.select({ count: count() }).from(subscription),
        db.select({ count: count() }).from(subscription).where(eq(subscription.status, 'active')),
        db.select({ count: count() }).from(subscription).where(eq(subscription.status, 'pending')),
        db.select({ count: count() }).from(subscription).where(eq(subscription.status, 'canceled')),
        db.select({ count: count() }).from(subscription).where(
          and(
            eq(subscription.status, 'active'),
            lte(subscription.nextBillingDate, new Date()),
          ),
        ),
      ]);

      // Payment metrics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const [
        totalRevenue,
        thisMonthRevenue,
        lastMonthRevenue,
        averageOrderValue,
      ] = await Promise.all([
        db.select({ total: sum(payment.amount) }).from(payment).where(eq(payment.status, 'completed')),
        db.select({ total: sum(payment.amount) }).from(payment).where(
          and(
            eq(payment.status, 'completed'),
            gte(payment.paidAt, startOfMonth),
          ),
        ),
        db.select({ total: sum(payment.amount) }).from(payment).where(
          and(
            eq(payment.status, 'completed'),
            gte(payment.paidAt, startOfLastMonth),
            lte(payment.paidAt, endOfLastMonth),
          ),
        ),
        db.select({
          count: count(),
          total: sum(payment.amount),
        }).from(payment).where(eq(payment.status, 'completed')),
      ]);

      // Direct debit contract metrics
      const [
        activeContracts,
        pendingContracts,
        expiredContracts,
      ] = await Promise.all([
        db.select({ count: count() }).from(paymentMethod).where(eq(paymentMethod.contractStatus, 'active')),
        db.select({ count: count() }).from(paymentMethod).where(eq(paymentMethod.contractStatus, 'pending_signature')),
        db.select({ count: count() }).from(paymentMethod).where(eq(paymentMethod.contractStatus, 'expired')),
      ]);

      // Webhook metrics
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [
        totalWebhooks,
        successfulWebhooks,
        failedWebhooks,
        lastWeekWebhooks,
      ] = await Promise.all([
        db.select({ count: count() }).from(webhookEvent),
        db.select({ count: count() }).from(webhookEvent).where(eq(webhookEvent.processed, true)),
        db.select({ count: count() }).from(webhookEvent).where(eq(webhookEvent.processed, false)),
        db.select({ count: count() }).from(webhookEvent).where(gte(webhookEvent.createdAt, lastWeek)),
      ]);

      const avgOrderValue = averageOrderValue[0]?.count && averageOrderValue[0]?.total
        ? Number(averageOrderValue[0].total) / averageOrderValue[0].count
        : 0;

      return Responses.ok(c, {
        subscriptions: {
          total: totalSubscriptions[0]?.count || 0,
          active: activeSubscriptions[0]?.count || 0,
          pending: pendingSubscriptions[0]?.count || 0,
          canceled: canceledSubscriptions[0]?.count || 0,
          dueTodayCount: dueTodaySubscriptions[0]?.count || 0,
        },
        payments: {
          totalRevenue: Number(totalRevenue[0]?.total || 0),
          thisMonth: Number(thisMonthRevenue[0]?.total || 0),
          lastMonth: Number(lastMonthRevenue[0]?.total || 0),
          averageOrderValue: avgOrderValue,
        },
        directDebits: {
          activeContracts: activeContracts[0]?.count || 0,
          pendingContracts: pendingContracts[0]?.count || 0,
          expiredContracts: expiredContracts[0]?.count || 0,
        },
        webhooks: {
          totalSent: totalWebhooks[0]?.count || 0,
          successfulDeliveries: successfulWebhooks[0]?.count || 0,
          failedDeliveries: failedWebhooks[0]?.count || 0,
          lastWeekActivity: lastWeekWebhooks[0]?.count || 0,
        },
      });
    } catch (error) {
      c.logger.error('Error fetching billing metrics', error instanceof Error ? error : new Error(String(error)));
      throw createError.internal('Failed to fetch billing metrics');
    }
  },
);
