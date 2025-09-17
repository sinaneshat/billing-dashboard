/**
 * Monthly Billing Cron Job Handler - Cloudflare Workers Optimized
 * Processes recurring subscriptions with ZarinPal Direct Debit
 * Optimized for D1 batch operations and Cloudflare Workers limits
 */

import { and, eq, isNull, lte } from 'drizzle-orm';

import { parseMetadata } from '@/api/common/metadata-utils';
import { apiLogger } from '@/api/middleware/hono-logger';
import { CurrencyExchangeService } from '@/api/services/currency-exchange';
import { ZarinPalService } from '@/api/services/zarinpal';
import { ZarinPalDirectDebitService } from '@/api/services/zarinpal-direct-debit';
import type { ApiEnv } from '@/api/types';
import { getDbAsync } from '@/db';
import { payment, paymentMethod, subscription } from '@/db/tables/billing';

type BillingResult = {
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
  chunksProcessed: number;
  timeoutReached: boolean;
};

type PaymentRecord = {
  id: string;
  status: string;
  retryCount?: number;
  maxRetries?: number;
  createdAt?: Date;
};

type BatchResult = {
  results: PaymentRecord[];
};

// Cloudflare Workers limits - following official documentation
const WORKER_TIMEOUT_MS = 28000; // 28s to allow for cleanup before 30s limit
const MAX_BATCH_SIZE = 25; // D1 batch limit per operation
const CHUNK_SIZE = 10; // Process subscriptions in chunks to avoid memory issues

// Helper to check if we're using D1 (production) vs BetterSQLite3 (development)
function supportsDbBatch(db: Awaited<ReturnType<typeof getDbAsync>>): boolean {
  return typeof (db as unknown as { batch?: unknown }).batch === 'function';
}

/**
 * Execute multiple database operations efficiently
 * Uses batch for D1 (production) or transaction for BetterSQLite3 (development)
 */
async function executeDatabaseOperations(operations: unknown[], db: Awaited<ReturnType<typeof getDbAsync>>) {
  if (operations.length === 0) {
    return;
  }

  if (supportsDbBatch(db)) {
    // Use batch operations for D1 (production)
    await (db as unknown as { batch: (ops: unknown[]) => Promise<unknown> }).batch(operations);
  } else {
    // Use transaction for BetterSQLite3 (development)
    await db.transaction(async (_tx) => {
      for (const operation of operations) {
        await operation;
      }
    });
  }
}

/**
 * Process monthly billing for all due subscriptions
 * This function is called by the Cloudflare cron trigger
 */
export async function processMonthlyBilling(env: ApiEnv['Bindings']): Promise<BillingResult> {
  const startTime = Date.now();
  const db = await getDbAsync();
  const result: BillingResult = {
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [],
    chunksProcessed: 0,
    timeoutReached: false,
  };

  apiLogger.info('Starting monthly billing process', { component: 'monthly-billing' });

  try {
    // Get active monthly subscriptions due for billing - optimized for D1
    const currentDate = new Date();
    const dueSubscriptions = await db
      .select()
      .from(subscription)
      .where(
        and(
          eq(subscription.status, 'active'),
          eq(subscription.billingPeriod, 'monthly'),
          lte(subscription.nextBillingDate, currentDate),
          isNull(subscription.endDate),
        ),
      )
      .limit(1000); // Limit to prevent memory issues

    apiLogger.info('Found subscriptions due for billing', {
      count: dueSubscriptions.length,
      component: 'monthly-billing',
    });

    if (dueSubscriptions.length === 0) {
      apiLogger.info('No subscriptions due for billing', { component: 'monthly-billing' });
      return result;
    }

    // Process subscriptions in chunks to respect Cloudflare Workers limits
    const chunks = [];
    for (let i = 0; i < dueSubscriptions.length; i += CHUNK_SIZE) {
      chunks.push(dueSubscriptions.slice(i, i + CHUNK_SIZE));
    }

    apiLogger.info('Processing subscriptions in chunks', {
      totalSubscriptions: dueSubscriptions.length,
      totalChunks: chunks.length,
      chunkSize: CHUNK_SIZE,
      component: 'monthly-billing',
    });

    // Process each chunk with timeout monitoring
    for (const [chunkIndex, chunk] of chunks.entries()) {
      // Check timeout before processing each chunk
      if (Date.now() - startTime > WORKER_TIMEOUT_MS) {
        result.timeoutReached = true;
        apiLogger.warn('Worker timeout approaching, stopping processing', {
          processedChunks: chunkIndex,
          totalChunks: chunks.length,
          elapsedMs: Date.now() - startTime,
          component: 'monthly-billing',
        });
        break;
      }

      try {
        await processSubscriptionChunk(chunk, env, result, db);
        result.chunksProcessed++;
      } catch (error) {
        const errorMessage = `Chunk ${chunkIndex} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMessage);
        apiLogger.error('Chunk processing error', {
          chunkIndex,
          error: errorMessage,
          component: 'monthly-billing',
        });
      }

      // Circuit breaker: stop if too many failures
      if (result.failed > result.successful && result.processed > 20) {
        apiLogger.error('Too many failures, stopping processing', {
          failed: result.failed,
          successful: result.successful,
          component: 'monthly-billing',
        });
        break;
      }
    }

    apiLogger.info('Monthly billing process completed', {
      result,
      component: 'monthly-billing',
    });
    return result;
  } catch (error) {
    const errorMessage = `Monthly billing process failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMessage);
    apiLogger.error('Monthly billing process failed', {
      error: errorMessage,
      component: 'monthly-billing',
    });
    return result;
  }
}

/**
 * Process a chunk of subscriptions using database operations
 */
async function processSubscriptionChunk(
  subscriptions: Array<typeof subscription.$inferSelect>,
  env: ApiEnv['Bindings'],
  result: BillingResult,
  db: Awaited<ReturnType<typeof getDbAsync>>,
) {
  const processingResults: Array<{ subscription: typeof subscription.$inferSelect; success: boolean; error?: string }> = [];

  for (const sub of subscriptions) {
    result.processed++;

    try {
      await processSingleSubscription(sub, env, result, db);
      processingResults.push({ subscription: sub, success: true });
    } catch (error) {
      result.failed++;
      const errorMessage = `Subscription ${sub.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMessage);
      processingResults.push({ subscription: sub, success: false, error: errorMessage });

      apiLogger.error('Billing process error', {
        subscriptionId: sub.id,
        error: errorMessage,
        component: 'monthly-billing',
      });
    }
  }

  // Update failed subscriptions using appropriate database pattern
  const failedUpdates = processingResults
    .filter(r => !r.success)
    .map((r) => {
      return db
        .update(subscription)
        .set({
          metadata: {
            ...parseMetadata(r.subscription.metadata),
            lastBillingError: r.error,
            lastBillingErrorAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(subscription.id, r.subscription.id));
    });

  if (failedUpdates.length > 0 && failedUpdates.length <= MAX_BATCH_SIZE) {
    try {
      await executeDatabaseOperations(failedUpdates, db);
    } catch (batchError) {
      apiLogger.error('Failed to update failed subscriptions', {
        error: batchError,
        count: failedUpdates.length,
        component: 'monthly-billing',
      });
    }
  }
}

/**
 * Process billing for a single subscription
 */
async function processSingleSubscription(
  sub: typeof subscription.$inferSelect,
  env: ApiEnv['Bindings'],
  result: BillingResult,
  db: Awaited<ReturnType<typeof getDbAsync>>,
) {
  // Find the active direct debit contract for this subscription
  if (!sub.directDebitContractId) {
    throw new Error('No direct debit contract available');
  }

  // Get the payment method record with contract signature - optimized query
  const contractRecord = await db
    .select()
    .from(paymentMethod)
    .where(
      and(
        eq(paymentMethod.userId, sub.userId),
        eq(paymentMethod.contractSignature, sub.directDebitContractId),
        eq(paymentMethod.isActive, true),
        eq(paymentMethod.contractType, 'direct_debit_contract'),
      ),
    )
    .limit(1);

  if (!contractRecord.length || !contractRecord[0]) {
    throw new Error('Active direct debit contract not found');
  }

  const contract = contractRecord[0];
  if (!contract.contractSignature) {
    throw new Error('Contract signature is missing');
  }

  // Query for payment status checks - handle both database types
  let existingPendingPayments: PaymentRecord[];
  let failedPaymentsToday: PaymentRecord[];

  if (supportsDbBatch(db)) {
    // Use batch for D1 (production)
    const paymentChecks = await (db as unknown as { batch: (ops: unknown[]) => Promise<BatchResult[]> }).batch([
      db.select().from(payment).where(
        and(
          eq(payment.subscriptionId, sub.id),
          eq(payment.status, 'pending'),
        ),
      ).limit(1),
      db.select().from(payment).where(
        and(
          eq(payment.subscriptionId, sub.id),
          eq(payment.status, 'failed'),
          lte(payment.nextRetryAt, new Date()),
        ),
      ),
    ]);
    existingPendingPayments = paymentChecks[0]?.results || [];
    failedPaymentsToday = paymentChecks[1]?.results || [];
  } else {
    // Use Promise.all for BetterSQLite3 (development)
    const paymentChecks = await Promise.all([
      db.select().from(payment).where(
        and(
          eq(payment.subscriptionId, sub.id),
          eq(payment.status, 'pending'),
        ),
      ).limit(1),
      db.select().from(payment).where(
        and(
          eq(payment.subscriptionId, sub.id),
          eq(payment.status, 'failed'),
          lte(payment.nextRetryAt, new Date()),
        ),
      ),
    ]);
    existingPendingPayments = paymentChecks[0];
    failedPaymentsToday = paymentChecks[1];
  }

  if (existingPendingPayments.length > 0) {
    throw new Error('Pending payment already exists');
  }

  // Determine retry count
  let retryCount = 0;
  let existingFailedPayment = null;

  if (failedPaymentsToday.length > 0) {
    // Use the most recent failed payment for retry logic
    const sortedPayments = failedPaymentsToday.sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0),
    );
    const mostRecentPayment = sortedPayments[0] as PaymentRecord;
    if (!mostRecentPayment) {
      throw new Error('Failed payment not found after sorting');
    }
    existingFailedPayment = mostRecentPayment;
    retryCount = existingFailedPayment.retryCount || 0;

    if (retryCount >= (existingFailedPayment.maxRetries || 3)) {
      // Max retries reached, suspend subscription
      const suspendOperation = db
        .update(subscription)
        .set({
          status: 'expired',
          endDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscription.id, sub.id));

      await executeDatabaseOperations([suspendOperation], db);
      throw new Error(`Max retries (${existingFailedPayment.maxRetries || 3}) reached, subscription suspended`);
    }
  }

  // Convert USD to IRR using centralized service
  const currencyService = CurrencyExchangeService.create();
  const exchangeResult = await currencyService.convertUsdToToman(sub.currentPrice);
  const exchangeRate = exchangeResult.exchangeRate;

  // Use the converted amount from the service
  const irrAmount = exchangeResult.tomanPrice;

  apiLogger.info('Currency conversion for billing', {
    subscriptionId: sub.id,
    originalUsdPrice: sub.currentPrice,
    convertedIrrAmount: irrAmount,
    exchangeRate,
    component: 'monthly-billing',
  });

  // Create payment record with converted amount
  const paymentId = crypto.randomUUID();
  const now = new Date();
  const paymentRecord = {
    id: paymentId,
    userId: sub.userId,
    subscriptionId: sub.id,
    productId: sub.productId,
    amount: irrAmount, // Store converted IRR amount
    status: 'pending' as const,
    paymentMethod: 'zarinpal_direct_debit',
    zarinpalDirectDebitUsed: true,
    retryCount,
    maxRetries: 3,
    createdAt: now,
    updatedAt: now,
    metadata: {
      originalUsdAmount: sub.currentPrice,
      exchangeRate,
      conversionTimestamp: now.toISOString(),
      billingCycle: 'monthly',
      isAutomaticBilling: true,
      directDebitContractId: contract.id,
    },
  };

  // Handle payment record creation/update
  const paymentOperations = [];
  if (existingFailedPayment) {
    // Update existing payment record for retry
    paymentOperations.push(
      db.update(payment)
        .set({
          ...paymentRecord,
          retryCount: retryCount + 1,
          nextRetryAt: null,
        })
        .where(eq(payment.id, (existingFailedPayment as PaymentRecord & { id: string }).id)),
    );
  } else {
    // Create new payment record
    paymentOperations.push(db.insert(payment).values(paymentRecord));
  }

  await executeDatabaseOperations(paymentOperations, db);

  try {
    // Create ZarinPal payment request first
    const zarinPal = ZarinPalService.create();
    const paymentRequest = await zarinPal.requestPayment({
      amount: irrAmount, // Use converted IRR amount
      currency: 'IRR',
      description: `Monthly subscription billing - ${new Date().toLocaleDateString('fa-IR')}`,
      callbackUrl: `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/zarinpal`,
      metadata: {
        subscriptionId: sub.id,
        paymentId,
        billingCycle: 'monthly',
        isAutomaticBilling: true,
        isDirectDebit: true,
      },
    });

    if (!paymentRequest.data?.authority) {
      throw new Error('Failed to create ZarinPal payment request');
    }

    const authority = paymentRequest.data.authority;

    // Update payment record with authority
    const paymentUpdateOps = [
      db.update(payment)
        .set({
          zarinpalAuthority: authority,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentId)),
    ];

    // Execute direct debit transaction using ZarinPal Direct Debit Service
    const directDebitService = ZarinPalDirectDebitService.create();
    if (!contract.contractSignature) {
      throw new Error('Contract signature is required for direct debit transaction');
    }
    const directDebitResult = await directDebitService.executeDirectTransaction({
      authority,
      signature: contract.contractSignature,
    });

    if (directDebitResult.data?.code === 100) {
      // Payment successful - batch all success updates
      const refId = directDebitResult.data.refrence_id?.toString();
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      const successNow = new Date();

      const successOperations = [
        // Update payment as completed
        db.update(payment)
          .set({
            status: 'completed',
            zarinpalRefId: refId,
            paidAt: successNow,
            updatedAt: successNow,
          })
          .where(eq(payment.id, paymentId)),
        // Update contract last used
        db.update(paymentMethod)
          .set({
            lastUsedAt: successNow,
            updatedAt: successNow,
          })
          .where(eq(paymentMethod.id, contract.id)),
        // Update subscription for next billing cycle
        db.update(subscription)
          .set({
            nextBillingDate,
            updatedAt: successNow,
          })
          .where(eq(subscription.id, sub.id)),
      ];

      await executeDatabaseOperations(successOperations, db);

      result.successful++;
      apiLogger.info('Subscription billed successfully with currency conversion', {
        subscriptionId: sub.id,
        paymentId,
        zarinpalRefId: refId,
        originalUsdAmount: sub.currentPrice,
        chargedIrrAmount: irrAmount,
        exchangeRate,
        component: 'monthly-billing',
      });
    } else {
      // Payment failed - batch failure updates
      const nextRetryAt = calculateNextRetryTime(retryCount + 1);
      const errorMessage = directDebitResult.data?.message || 'Direct debit payment failed';
      const failureNow = new Date();

      const failureOperations = [
        db.update(payment)
          .set({
            status: 'failed',
            failureReason: errorMessage,
            failedAt: failureNow,
            nextRetryAt,
            updatedAt: failureNow,
          })
          .where(eq(payment.id, paymentId)),
      ];

      await executeDatabaseOperations(failureOperations, db);
      result.failed++;
      throw new Error(`ZarinPal Direct Debit failed: ${errorMessage}`);
    }

    // Execute the payment authority update if needed
    if (paymentUpdateOps.length > 0) {
      await executeDatabaseOperations(paymentUpdateOps, db);
    }
  } catch (error) {
    // Handle payment processing error
    const nextRetryAt = calculateNextRetryTime(retryCount + 1);
    const errorMessage = error instanceof Error ? error.message : 'Unknown payment error';
    const errorNow = new Date();

    const errorOperations = [
      db.update(payment)
        .set({
          status: 'failed',
          failureReason: errorMessage,
          failedAt: errorNow,
          nextRetryAt,
          updatedAt: errorNow,
        })
        .where(eq(payment.id, paymentId)),
    ];

    try {
      await executeDatabaseOperations(errorOperations, db);
    } catch (batchError) {
      apiLogger.error('Failed to update payment error', {
        paymentId,
        error: batchError,
        component: 'monthly-billing',
      });
    }

    throw error;
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
 * Cloudflare Workers scheduled event handler for monthly billing
 * Optimized for D1 and Workers constraints
 */
export default {
  async scheduled(event: ScheduledEvent, env: ApiEnv, ctx: ExecutionContext): Promise<void> {
    const startTime = Date.now();

    apiLogger.info('Monthly billing cron job triggered', {
      cron: event.cron,
      scheduledTime: event.scheduledTime,
      component: 'cron-scheduler',
    });

    // Use ctx.waitUntil to extend execution context per Cloudflare best practices
    ctx.waitUntil((async () => {
      try {
        const result = await processMonthlyBilling(env.Bindings);
        const executionTime = Date.now() - startTime;

        // Log comprehensive results for monitoring
        apiLogger.info('Monthly billing results', {
          timestamp: new Date().toISOString(),
          cron: event.cron,
          executionTimeMs: executionTime,
          isTimeoutReached: result.timeoutReached,
          chunksProcessed: result.chunksProcessed,
          processed: result.processed,
          successful: result.successful,
          failed: result.failed,
          errorCount: result.errors.length,
          component: 'cron-scheduler',
        });

        // Send alerts for failures or timeouts to external monitoring
        if (env.Bindings.NEXT_PUBLIC_ROUNDTABLE_WEBHOOK_URL && (result.failed > 0 || result.timeoutReached || result.errors.length > 0)) {
          try {
            const alertPayload = {
              source: 'monthly-billing-cron',
              timestamp: new Date().toISOString(),
              executionTimeMs: executionTime,
              summary: {
                processed: result.processed,
                successful: result.successful,
                failed: result.failed,
                chunksProcessed: result.chunksProcessed,
                timeoutReached: result.timeoutReached,
              },
              alerts: [
                result.failed > 0 && 'billing_failures',
                result.timeoutReached && 'worker_timeout',
                result.errors.length > 10 && 'high_error_count',
              ].filter(Boolean),
              errors: result.errors.slice(0, 10), // Limit error details to prevent large payloads
            };

            await fetch(env.Bindings.NEXT_PUBLIC_ROUNDTABLE_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(alertPayload),
            });
          } catch (webhookError) {
            apiLogger.error('Failed to send billing report to external webhook', {
              error: webhookError,
              component: 'cron-scheduler',
            });
          }
        }
      } catch (error) {
        const executionTime = Date.now() - startTime;
        apiLogger.error('Monthly billing cron job failed', {
          error,
          executionTimeMs: executionTime,
          component: 'cron-scheduler',
        });
      }
    })());
  },
};
