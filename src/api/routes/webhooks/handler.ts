import type { RouteHandler } from '@hono/zod-openapi';
import { and, desc, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { ok } from '@/api/common/responses';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { payment, subscription, webhookEvent } from '@/db/tables/billing';
import { createZarinPalService } from '@/services/zarinpal';

import type {
  getWebhookEventsRoute,
  testWebhookRoute,
  zarinPalWebhookRoute,
} from './route';

/**
 * Handler for POST /webhooks/zarinpal
 * Receives and processes ZarinPal webhooks
 */
export const zarinPalWebhookHandler: RouteHandler<typeof zarinPalWebhookRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'zarinpal-webhook');

  const webhookPayload = c.req.valid('json');

  // Create webhook event record immediately for audit trail
  const eventId = crypto.randomUUID();
  const eventRecord = {
    id: eventId,
    source: 'zarinpal',
    eventType: `payment.${webhookPayload.status === 'OK' ? 'completed' : 'failed'}`,
    rawPayload: webhookPayload,
    processed: false,
    forwardedToExternal: false,
    externalWebhookUrl: c.env?.EXTERNAL_WEBHOOK_URL || null,
  };

  try {
    await db.insert(webhookEvent).values(eventRecord);
  } catch (error) {
    console.error('Failed to create webhook event record:', error);
    // Continue processing even if logging fails
  }

  let paymentRecord = null;
  let processed = false;

  try {
    // Find payment by authority
    if (webhookPayload.authority) {
      const paymentData = await db
        .select()
        .from(payment)
        .where(eq(payment.zarinpalAuthority, webhookPayload.authority))
        .limit(1);

      if (paymentData.length > 0) {
        paymentRecord = paymentData[0]!;

        // Process payment based on webhook status
        if (webhookPayload.status === 'OK') {
          // Verify payment with ZarinPal to ensure authenticity
          const zarinPal = createZarinPalService({
            merchantId: c.env.ZARINPAL_MERCHANT_ID,
            accessToken: c.env.ZARINPAL_ACCESS_TOKEN,
          });

          try {
            const verification = await zarinPal.verifyPayment({
              authority: webhookPayload.authority,
              amount: paymentRecord.amount,
            });

            if (verification.data?.code === 100 || verification.data?.code === 101) {
              // Update payment record
              await db
                .update(payment)
                .set({
                  status: 'completed',
                  zarinpalRefId: verification.data?.ref_id?.toString() || webhookPayload.ref_id,
                  zarinpalCardHash: verification.data?.card_hash || webhookPayload.card_hash,
                  paidAt: new Date(),
                })
                .where(eq(payment.id, paymentRecord.id));

              // Update subscription if exists
              if (paymentRecord.subscriptionId) {
                const subscriptionData = await db
                  .select()
                  .from(subscription)
                  .where(eq(subscription.id, paymentRecord.subscriptionId))
                  .limit(1);

                if (subscriptionData.length && subscriptionData[0]!.status === 'pending') {
                  const startDate = new Date();
                  const nextBillingDate = subscriptionData[0]!.billingPeriod === 'monthly'
                    ? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
                    : null;

                  await db
                    .update(subscription)
                    .set({
                      status: 'active',
                      startDate,
                      nextBillingDate,
                      zarinpalDirectDebitToken: verification.data?.card_hash || webhookPayload.card_hash,
                    })
                    .where(eq(subscription.id, paymentRecord.subscriptionId));
                }
              }

              processed = true;
            } else {
              // Verification failed, mark payment as failed
              await db
                .update(payment)
                .set({
                  status: 'failed',
                  failureReason: `Verification failed: ${verification.data?.message || 'Unknown error'}`,
                  failedAt: new Date(),
                })
                .where(eq(payment.id, paymentRecord.id));

              processed = true;
            }
          } catch (verificationError) {
            console.error('Payment verification failed:', verificationError);
            // Mark as processed but with error
            processed = true;
          }
        } else {
          // Payment failed
          await db
            .update(payment)
            .set({
              status: 'failed',
              failureReason: 'Payment failed (webhook notification)',
              failedAt: new Date(),
            })
            .where(eq(payment.id, paymentRecord.id));

          processed = true;
        }
      }
    }

    // Update webhook event processing status
    await db
      .update(webhookEvent)
      .set({
        processed,
        processedAt: processed ? new Date() : null,
        paymentId: paymentRecord?.id || null,
      })
      .where(eq(webhookEvent.id, eventId));

    // Forward to external webhook URL if configured
    let forwarded = false;
    if (c.env?.EXTERNAL_WEBHOOK_URL) {
      try {
        const forwardPayload = {
          source: 'zarinpal',
          eventType: eventRecord.eventType,
          timestamp: new Date().toISOString(),
          data: webhookPayload,
          paymentId: paymentRecord?.id,
          subscriptionId: paymentRecord?.subscriptionId,
        };

        const response = await fetch(c.env.EXTERNAL_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'DeadPixel-BillingDashboard/1.0',
            'X-Webhook-Source': 'billing-dashboard',
            'X-Event-ID': eventId,
          },
          body: JSON.stringify(forwardPayload),
        });

        forwarded = response.ok;

        // Update forwarding status
        await db
          .update(webhookEvent)
          .set({
            forwardedToExternal: forwarded,
            forwardedAt: forwarded ? new Date() : null,
            forwardingError: forwarded ? null : `HTTP ${response.status}: ${response.statusText}`,
          })
          .where(eq(webhookEvent.id, eventId));
      } catch (forwardError) {
        console.error('Failed to forward webhook:', forwardError);

        await db
          .update(webhookEvent)
          .set({
            forwardedToExternal: false,
            forwardingError: forwardError instanceof Error ? forwardError.message : 'Unknown error',
          })
          .where(eq(webhookEvent.id, eventId));
      }
    }

    return ok(c, {
      received: true,
      eventId,
      processed,
      forwarded,
    });
  } catch (error) {
    console.error('Webhook processing failed:', error);

    // Update webhook event with error
    try {
      await db
        .update(webhookEvent)
        .set({
          processingError: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(webhookEvent.id, eventId));
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to process webhook',
    });
  }
};

/**
 * Handler for GET /webhooks/events
 * Returns webhook events for monitoring and debugging
 */
export const getWebhookEventsHandler: RouteHandler<typeof getWebhookEventsRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'webhook-events');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  const { source, processed, limit, offset } = c.req.valid('query');

  try {
    // Build where conditions
    const whereConditions = [];
    if (source) {
      whereConditions.push(eq(webhookEvent.source, source));
    }
    if (processed !== undefined) {
      whereConditions.push(eq(webhookEvent.processed, processed === 'true'));
    }

    const events = await db
      .select()
      .from(webhookEvent)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(webhookEvent.createdAt))
      .limit(limit)
      .offset(offset);

    const transformedEvents = events.map(event => ({
      id: event.id,
      source: event.source,
      eventType: event.eventType,
      paymentId: event.paymentId,
      processed: event.processed,
      processedAt: event.processedAt ? new Date(event.processedAt).toISOString() : null,
      forwardedToExternal: event.forwardedToExternal ?? false,
      forwardedAt: event.forwardedAt ? new Date(event.forwardedAt).toISOString() : null,
      externalWebhookUrl: event.externalWebhookUrl,
      createdAt: new Date(event.createdAt).toISOString(),
    }));

    return ok(c, transformedEvents);
  } catch (error) {
    console.error('Failed to fetch webhook events:', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to fetch webhook events',
    });
  }
};

/**
 * Handler for POST /webhooks/test
 * Tests webhook delivery to external URL
 */
export const testWebhookHandler: RouteHandler<typeof testWebhookRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'test-webhook');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  const { url, payload } = c.req.valid('json');

  try {
    const testPayload = payload || {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Test webhook from billing dashboard',
    };

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DeadPixel-BillingDashboard/1.0',
        'X-Webhook-Source': 'billing-dashboard-test',
        'X-Test-Webhook': 'true',
      },
      body: JSON.stringify(testPayload),
    });
    const responseTime = Date.now() - startTime;

    const success = response.ok;
    let error: string | undefined;

    if (!success) {
      try {
        const errorText = await response.text();
        error = `HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`;
      } catch {
        error = `HTTP ${response.status}: ${response.statusText}`;
      }
    }

    return ok(c, {
      success,
      statusCode: response.status,
      responseTime,
      error,
    });
  } catch (error) {
    console.error('Webhook test failed:', error);

    return ok(c, {
      success: false,
      statusCode: 0,
      responseTime: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
