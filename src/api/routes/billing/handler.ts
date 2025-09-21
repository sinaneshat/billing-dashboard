/**
 * Billing Operations Handler - Recurring Payments & Metrics
 *
 * Handles automated billing operations including:
 * - Recurring payment processing for direct debit subscriptions
 * - Billing metrics and monitoring
 * - Subscription lifecycle management
 */

import crypto from 'node:crypto';

import type { RouteHandler } from '@hono/zod-openapi';
import { and, count, eq, gte, isNotNull, lte, sum } from 'drizzle-orm';

import { createError } from '@/api/common/error-handling';
import { createHandler, Responses } from '@/api/core';
import { ZarinPalDirectDebitService } from '@/api/services/zarinpal-direct-debit';
import type { ApiEnv } from '@/api/types';
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

/**
 * Process recurring payments for subscriptions with direct debit contracts
 * This endpoint should be called by a cron job (Cloudflare Cron Triggers)
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

    for (const row of dueSubscriptions) {
      const { subscription: sub, product: prod, paymentMethod: pm, user: userRecord } = row;

      try {
        // Skip if already processed today
        const existingPaymentToday = await db
          .select()
          .from(payment)
          .where(
            and(
              eq(payment.subscriptionId, sub.id),
              eq(payment.status, 'completed'),
              gte(payment.createdAt, new Date(today.getFullYear(), today.getMonth(), today.getDate())),
            ),
          )
          .limit(1);

        if (existingPaymentToday.length > 0) {
          results.push({
            subscriptionId: sub.id,
            userId: sub.userId,
            status: 'skipped',
            reason: 'Already processed today',
          });
          skippedSubscriptions++;
          continue;
        }

        // Calculate amount in IRR
        const amountInRials = Math.round(prod.price * 65000); // USD to IRR conversion

        // Create payment record
        const paymentId = crypto.randomUUID();
        const paymentData = {
          id: paymentId,
          userId: sub.userId,
          subscriptionId: sub.id,
          productId: prod.id,
          amount: amountInRials,
          currency: 'IRR' as const,
          status: 'pending' as const,
          paymentMethod: 'zarinpal',
          zarinpalDirectDebitUsed: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.insert(payment).values(paymentData);

        // Process direct debit payment - directly charge from authorized bank account
        const zarinPalDirectDebit = ZarinPalDirectDebitService.create();
        const directDebitResult = await zarinPalDirectDebit.chargeDirectDebit({
          amount: amountInRials,
          currency: 'IRR',
          description: `Monthly subscription to ${prod.name}`,
          contractSignature: pm.contractSignature!,
          metadata: {
            subscriptionId: sub.id,
            paymentId,
            userId: sub.userId,
            productId: prod.id,
            type: 'subscription',
            billingCycle: 'monthly',
          },
        });

        if (directDebitResult.success && directDebitResult.data?.refId) {
          // Payment succeeded
          await db.update(payment)
            .set({
              status: 'completed',
              zarinpalRefId: directDebitResult.data.refId.toString(),
              paidAt: new Date(),
              updatedAt: new Date(),
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
              failedBillingAttempts: 0, // Reset failed attempts
              updatedAt: new Date(),
            })
            .where(eq(subscription.id, sub.id));

          // Log billing event
          await db.insert(billingEvent).values({
            id: crypto.randomUUID(),
            userId: sub.userId,
            subscriptionId: sub.id,
            paymentId,
            paymentMethodId: pm.id,
            eventType: 'recurring_payment_success',
            eventData: {
              amount: amountInRials,
              refId: directDebitResult.data.refId,
              billingCycle: (sub.billingCycleCount || 0) + 1,
              nextBillingDate: nextBillingDate.toISOString(),
            },
            severity: 'info',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // DISPATCH ROUNDTABLE WEBHOOK: Invoice payment succeeded
          try {
            const { WebhookEventBuilders, RoundtableWebhookForwarder } = await import('@/api/routes/webhooks/handler');

            const customerId = WebhookEventBuilders.generateVirtualStripeCustomerId(sub.userId);
            const invoiceId = `in_${crypto.randomUUID().replace(/-/g, '')}`;

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
                zarinpalRefId: directDebitResult.data.refId.toString(),
                billingCycle: ((sub.billingCycleCount || 0) + 1).toString(),
                recurringPayment: 'true',
              },
            );

            await RoundtableWebhookForwarder.forwardEvent(invoiceEvent);
          } catch (webhookError) {
            c.logger.error('Failed to dispatch Roundtable webhook for recurring payment', webhookError instanceof Error ? webhookError : new Error(String(webhookError)));
          }

          results.push({
            subscriptionId: sub.id,
            userId: sub.userId,
            status: 'success',
            amount: amountInRials,
          });
          successfulPayments++;
        } else {
          // Payment failed
          const failureReason = directDebitResult.error || 'Direct debit payment failed';

          await db.update(payment)
            .set({
              status: 'failed',
              failureReason,
              failedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(payment.id, paymentId));

          // Update subscription with failed billing attempt
          const failedAttempts = (sub.failedBillingAttempts || 0) + 1;
          const maxFailedAttempts = 3;

          type SubscriptionUpdate = {
            lastBillingAttempt: Date;
            failedBillingAttempts: number;
            updatedAt: Date;
            status?: 'active' | 'canceled' | 'expired' | 'pending';
            endDate?: Date | null;
            cancellationReason?: string | null;
            nextBillingDate?: Date | null;
          };

          const subscriptionUpdate: SubscriptionUpdate = {
            lastBillingAttempt: new Date(),
            failedBillingAttempts: failedAttempts,
            updatedAt: new Date(),
          };

          // If too many failed attempts, cancel subscription
          if (failedAttempts >= maxFailedAttempts) {
            subscriptionUpdate.status = 'canceled';
            subscriptionUpdate.endDate = new Date();
            subscriptionUpdate.cancellationReason = `Payment failed ${maxFailedAttempts} times`;
            subscriptionUpdate.nextBillingDate = null;
          } else {
            // Retry in 3 days
            const retryDate = new Date(today);
            retryDate.setDate(retryDate.getDate() + 3);
            subscriptionUpdate.nextBillingDate = retryDate;
          }

          await db.update(subscription)
            .set(subscriptionUpdate)
            .where(eq(subscription.id, sub.id));

          // Log billing event
          await db.insert(billingEvent).values({
            id: crypto.randomUUID(),
            userId: sub.userId,
            subscriptionId: sub.id,
            paymentId,
            paymentMethodId: pm.id,
            eventType: failedAttempts >= maxFailedAttempts ? 'subscription_cancelled_payment_failure' : 'recurring_payment_failed',
            eventData: {
              amount: amountInRials,
              failureReason,
              failedAttempts,
              subscriptionCanceled: failedAttempts >= maxFailedAttempts,
            },
            severity: failedAttempts >= maxFailedAttempts ? 'critical' : 'warning',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // DISPATCH ROUNDTABLE WEBHOOK: Invoice payment failed or subscription canceled
          try {
            const { WebhookEventBuilders, RoundtableWebhookForwarder } = await import('@/api/routes/webhooks/handler');

            const customerId = WebhookEventBuilders.generateVirtualStripeCustomerId(sub.userId);
            const invoiceId = `in_${crypto.randomUUID().replace(/-/g, '')}`;

            if (failedAttempts >= maxFailedAttempts) {
              // Send subscription deleted event
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
          } catch (webhookError) {
            c.logger.error('Failed to dispatch Roundtable webhook for failed payment', webhookError instanceof Error ? webhookError : new Error(String(webhookError)));
          }

          results.push({
            subscriptionId: sub.id,
            userId: sub.userId,
            status: 'failed',
            amount: amountInRials,
            reason: failureReason,
          });
          failedPayments++;
        }
      } catch (error) {
        c.logger.error(`Error processing recurring payment for subscription ${sub.id}`, error instanceof Error ? error : new Error(String(error)));

        results.push({
          subscriptionId: sub.id,
          userId: sub.userId,
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
