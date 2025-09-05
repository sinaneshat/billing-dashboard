/**
 * Comprehensive Webhook System Handler
 *
 * Enhanced webhook processing with comprehensive event dispatching following Stripe patterns.
 * Includes endpoint management, event tracking, and standardized event schemas.
 */

import crypto from 'node:crypto';

import type { RouteHandler } from '@hono/zod-openapi';
import { and, desc, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { z } from 'zod';

import type { FetchConfig } from '@/api/common/fetch-utilities';
import { postJSON } from '@/api/common/fetch-utilities';
import { apiLogger } from '@/api/middleware/hono-logger';
import { billingRepositories } from '@/api/repositories/billing-repositories';
import { ZarinPalService } from '@/api/services/zarinpal';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { webhookEvent } from '@/db/tables/billing';

import type {
  getWebhookEventsRoute,
  testWebhookRoute,
  zarinPalWebhookRoute,
} from './route';

// ============================================================================
// WEBHOOK EVENT SCHEMAS (CONTEXT7 PATTERN)
// ============================================================================

/**
 * Discriminated union for webhook events (Context7 Pattern)
 * Maximum type safety replacing Record<string, unknown>
 */
const WebhookEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('payment_intent.succeeded'),
    id: z.string(),
    object: z.literal('event'),
    created: z.number().int().positive(),
    data: z.object({
      object: z.object({
        id: z.string(),
        object: z.literal('payment_intent'),
        customer: z.string(),
        amount: z.number().int().positive(),
        currency: z.literal('irr'),
        status: z.literal('succeeded'),
        created: z.number().int().positive(),
        metadata: z.record(z.string(), z.string()),
      }),
    }),
    livemode: z.boolean(),
    api_version: z.string(),
  }),
  z.object({
    type: z.literal('payment_intent.payment_failed'),
    id: z.string(),
    object: z.literal('event'),
    created: z.number().int().positive(),
    data: z.object({
      object: z.object({
        id: z.string(),
        object: z.literal('payment_intent'),
        customer: z.string(),
        amount: z.number().int().positive(),
        currency: z.literal('irr'),
        status: z.literal('payment_failed'),
        last_payment_error: z.object({
          code: z.string(),
          message: z.string(),
          type: z.literal('api_error'),
        }).optional(),
        created: z.number().int().positive(),
        metadata: z.record(z.string(), z.string()),
      }),
    }),
    livemode: z.boolean(),
    api_version: z.string(),
  }),
  z.object({
    type: z.literal('subscription.updated'),
    id: z.string(),
    object: z.literal('event'),
    created: z.number().int().positive(),
    data: z.object({
      object: z.object({
        id: z.string(),
        object: z.literal('subscription'),
        customer: z.string(),
        status: z.string(),
        created: z.number().int().positive(),
        metadata: z.record(z.string(), z.string()),
      }),
    }),
    livemode: z.boolean(),
    api_version: z.string(),
  }),
]);

const _WebhookEndpointSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  enabled_events: z.array(z.string()),
  status: z.enum(['enabled', 'disabled']),
  secret: z.string(),
  created: z.number().int().positive(),
});

type WebhookEvent = z.infer<typeof WebhookEventSchema>;
type WebhookEndpoint = z.infer<typeof _WebhookEndpointSchema>;

// ============================================================================
// WEBHOOK EVENT BUILDERS (TYPE-SAFE VERSION)
// ============================================================================

/**
 * Type-safe webhook event builders for common billing events
 */
class WebhookEventBuilders {
  static generateEventId(): string {
    const prefix = 'evt_';
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}${timestamp}${random}`;
  }

  static toUnixTimestamp(date: Date | number | string): number {
    if (typeof date === 'number')
      return Math.floor(date / 1000);
    if (typeof date === 'string')
      return Math.floor(new Date(date).getTime() / 1000);
    return Math.floor(date.getTime() / 1000);
  }

  static createPaymentSucceededEvent(paymentId: string, customerId: string, amount: number): WebhookEvent {
    const event = {
      id: this.generateEventId(),
      object: 'event' as const,
      type: 'payment_intent.succeeded' as const,
      created: this.toUnixTimestamp(new Date()),
      data: {
        object: {
          id: paymentId,
          object: 'payment_intent' as const,
          customer: customerId,
          amount: Math.round(amount),
          currency: 'irr' as const,
          status: 'succeeded' as const,
          created: this.toUnixTimestamp(new Date()),
          metadata: {},
        },
      },
      livemode: process.env.NODE_ENV === 'production',
      api_version: '2024-01-01',
    };

    const validation = WebhookEventSchema.safeParse(event);
    if (!validation.success) {
      throw new Error(`Invalid webhook event schema: ${validation.error.message}`);
    }
    return validation.data;
  }

  static createPaymentFailedEvent(paymentId: string, customerId: string, amount: number, errorMessage?: string): WebhookEvent {
    const event = {
      id: this.generateEventId(),
      object: 'event' as const,
      type: 'payment_intent.payment_failed' as const,
      created: this.toUnixTimestamp(new Date()),
      data: {
        object: {
          id: paymentId,
          object: 'payment_intent' as const,
          customer: customerId,
          amount: Math.round(amount),
          currency: 'irr' as const,
          status: 'payment_failed' as const,
          last_payment_error: errorMessage
            ? {
                code: 'payment_failed',
                message: errorMessage,
                type: 'api_error' as const,
              }
            : undefined,
          created: this.toUnixTimestamp(new Date()),
          metadata: {},
        },
      },
      livemode: process.env.NODE_ENV === 'production',
      api_version: '2024-01-01',
    };

    const validation = WebhookEventSchema.safeParse(event);
    if (!validation.success) {
      throw new Error(`Invalid webhook event schema: ${validation.error.message}`);
    }
    return validation.data;
  }

  static createSubscriptionUpdatedEvent(subscriptionId: string, customerId: string, status: string): WebhookEvent {
    const event = {
      id: this.generateEventId(),
      object: 'event' as const,
      type: 'subscription.updated' as const,
      created: this.toUnixTimestamp(new Date()),
      data: {
        object: {
          id: subscriptionId,
          object: 'subscription' as const,
          customer: customerId,
          status: status as string,
          created: this.toUnixTimestamp(new Date()),
          metadata: {},
        },
      },
      livemode: process.env.NODE_ENV === 'production',
      api_version: '2024-01-01',
    };

    const validation = WebhookEventSchema.safeParse(event);
    if (!validation.success) {
      throw new Error(`Invalid webhook event schema: ${validation.error.message}`);
    }
    return validation.data;
  }
}

// ============================================================================
// WEBHOOK ENDPOINT MANAGEMENT (SIMPLIFIED INLINE VERSION)
// ============================================================================

/**
 * Type-safe in-memory webhook endpoint storage
 */
class WebhookEndpointManager {
  private static endpoints = new Map<string, WebhookEndpoint>();

  static async dispatchEvent(event: WebhookEvent): Promise<void> {
    const endpoints = Array.from(this.endpoints.values()).filter(ep =>
      ep.status === 'enabled' && (
        ep.enabled_events.includes('*')
        || ep.enabled_events.includes(event.type)
      ),
    );

    if (endpoints.length === 0) {
      apiLogger.info('No webhook endpoints configured', {
        logType: 'api' as const,
        method: 'POST' as const,
        path: '/webhooks/dispatch',
        responseSize: 0,
      });
      return;
    }

    // Dispatch to all endpoints in parallel
    await Promise.allSettled(
      endpoints.map(endpoint => this.deliverToEndpoint(endpoint, event)),
    );
  }

  private static async deliverToEndpoint(endpoint: WebhookEndpoint, event: WebhookEvent): Promise<void> {
    const payload = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(payload, endpoint.secret, timestamp);

    const requestHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'BillingDashboard-Webhooks/1.0',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': timestamp.toString(),
      'X-Webhook-Event-Type': event.type,
      'X-Webhook-Event-Id': event.id,
    };

    const fetchConfig: FetchConfig = {
      timeoutMs: 15000,
      maxRetries: 2,
      correlationId: `webhook-${event.id}-${endpoint.id}`,
    };

    try {
      const result = await postJSON(endpoint.url, event, fetchConfig, requestHeaders);

      apiLogger.info('Webhook delivered', {
        logType: 'api' as const,
        method: 'POST' as const,
        path: endpoint.url,
        statusCode: result.response?.status,
        duration: 0, // Will be filled by actual timing
      });
    } catch (error) {
      apiLogger.error('Webhook delivery failed', {
        logType: 'api' as const,
        method: 'POST' as const,
        path: endpoint.url,
        statusCode: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private static generateSignature(payload: string, secret: string, timestamp: number): string {
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    return `t=${timestamp},v1=${signature}`;
  }
}

// ============================================================================
// SECURITY AND RATE LIMITING
// ============================================================================

const webhookRateLimiter = new Map<string, { count: number; resetTime: number }>();

function cleanupRateLimiter(): void {
  const now = Date.now();
  for (const [key, value] of webhookRateLimiter.entries()) {
    if (value.resetTime <= now) {
      webhookRateLimiter.delete(key);
    }
  }
}

setInterval(cleanupRateLimiter, 5 * 60 * 1000);

async function validateWebhookSecurity(c: { req: { header: (name: string) => string | undefined } }): Promise<void> {
  const clientIP = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
  const userAgent = c.req.header('user-agent') || '';
  const timestamp = c.req.header('x-zarinpal-timestamp') || '';

  // Rate limiting: max 10 requests per minute per IP
  const rateLimitKey = `webhook:${clientIP}`;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;

  const current = webhookRateLimiter.get(rateLimitKey);
  if (current && current.resetTime > now) {
    if (current.count >= maxRequests) {
      throw new HTTPException(HttpStatusCodes.TOO_MANY_REQUESTS, {
        message: 'Webhook rate limit exceeded',
      });
    }
    current.count++;
  } else {
    webhookRateLimiter.set(rateLimitKey, {
      count: 1,
      resetTime: now + windowMs,
    });
  }

  // Validate User-Agent
  if (!userAgent.toLowerCase().includes('zarinpal')) {
    apiLogger.warn('Suspicious webhook user agent', {
      userAgent,
      clientIP,
      component: 'webhook-security',
    });
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: 'Invalid webhook source',
    });
  }

  // Timestamp validation
  if (timestamp) {
    const webhookTimestamp = Number.parseInt(timestamp, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(currentTimestamp - webhookTimestamp);

    if (timeDiff > 300) {
      apiLogger.warn('Webhook timestamp validation failed', {
        webhookTimestamp,
        currentTimestamp,
        timeDiff,
        component: 'webhook-security',
      });
      throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
        message: 'Webhook timestamp validation failed',
      });
    }
  }

  // IP whitelist validation
  const zarinpalIPRanges = ['185.231.115.0/24', '5.253.26.0/24'];
  const isLocalhost = clientIP === '127.0.0.1' || clientIP === 'unknown' || clientIP.startsWith('192.168.');

  if (!isLocalhost && process.env.NODE_ENV === 'production') {
    const isValidIP = zarinpalIPRanges.some((range) => {
      return range.includes(clientIP.split('.').slice(0, 3).join('.'));
    });

    if (!isValidIP) {
      apiLogger.warn('Webhook request from unauthorized IP', {
        clientIP,
        component: 'webhook-security',
      });
      throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
        message: 'Webhook request from unauthorized IP',
      });
    }
  }

  // Content-Type validation
  const contentType = c.req.header('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: 'Invalid content type for webhook',
    });
  }

  apiLogger.info('Webhook security validation passed', {
    clientIP,
    userAgent,
    component: 'webhook-security',
  });
}

// ============================================================================
// MAIN WEBHOOK HANDLERS
// ============================================================================

/**
 * Enhanced ZarinPal Webhook Handler with Event Dispatching
 */
export const zarinPalWebhookHandler: RouteHandler<typeof zarinPalWebhookRoute, ApiEnv> = async (c) => {
  await validateWebhookSecurity(c);

  const webhookPayload = c.req.valid('json');

  if (!webhookPayload || typeof webhookPayload !== 'object') {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: 'Invalid webhook payload structure',
    });
  }

  if (!webhookPayload.authority || !webhookPayload.status) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: 'Missing required webhook fields: authority or status',
    });
  }

  // Create webhook event record for audit trail
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
    await billingRepositories.webhookEvents.createEvent(eventRecord);
  } catch (error) {
    apiLogger.error('Failed to create webhook event record', { error });
  }

  let paymentRecord = null;
  let subscriptionRecord = null;
  let processed = false;

  // Find payment by authority
  if (webhookPayload.authority) {
    paymentRecord = await billingRepositories.payments.findByZarinpalAuthority(webhookPayload.authority);

    if (paymentRecord) {
      // Get subscription if exists
      if (paymentRecord.subscriptionId) {
        subscriptionRecord = await billingRepositories.subscriptions.findById(paymentRecord.subscriptionId);
      }

      // Process payment based on webhook status
      if (webhookPayload.status === 'OK') {
        const zarinPal = ZarinPalService.create(c.env);

        try {
          const verification = await zarinPal.verifyPayment({
            authority: webhookPayload.authority,
            amount: paymentRecord.amount,
          });

          if (verification.data?.code === 100 || verification.data?.code === 101) {
            // Update payment record
            const updatedPayment = await billingRepositories.payments.updateStatus(
              paymentRecord.id,
              'completed',
              {
                zarinpalRefId: verification.data?.ref_id?.toString() || webhookPayload.ref_id,
                zarinpalCardHash: verification.data?.card_hash || webhookPayload.card_hash,
                paidAt: new Date(),
              },
            );

            // 🎯 DISPATCH WEBHOOK EVENT: Payment succeeded
            const paymentEvent = WebhookEventBuilders.createPaymentSucceededEvent(
              updatedPayment.id,
              updatedPayment.userId,
              updatedPayment.amount,
            );
            await WebhookEndpointManager.dispatchEvent(paymentEvent);

            // Update subscription if exists
            if (paymentRecord.subscriptionId && subscriptionRecord) {
              if (subscriptionRecord.status === 'pending') {
                const startDate = new Date();
                const nextBillingDate = subscriptionRecord.billingPeriod === 'monthly'
                  ? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
                  : null;

                const updatedSubscription = await billingRepositories.subscriptions.update(subscriptionRecord.id, {
                  status: 'active',
                  startDate,
                  nextBillingDate,
                  directDebitContractId: verification.data?.card_hash || webhookPayload.card_hash,
                });

                // 🎯 DISPATCH WEBHOOK EVENT: Subscription activated
                const subscriptionEvent = WebhookEventBuilders.createSubscriptionUpdatedEvent(
                  updatedSubscription.id,
                  updatedSubscription.userId,
                  'active',
                );
                await WebhookEndpointManager.dispatchEvent(subscriptionEvent);

                subscriptionRecord = updatedSubscription;
              }
            }

            apiLogger.info('Payment verified and webhook events dispatched', {
              operation: 'payment_verification_success',
              paymentId: paymentRecord.id,
              zarinpalRefId: verification.data?.ref_id,
              subscriptionId: paymentRecord.subscriptionId,
              webhookEventsDispatched: true,
            });

            processed = true;
          } else {
            // Verification failed
            const updatedPayment = await billingRepositories.payments.updateStatus(
              paymentRecord.id,
              'failed',
              {
                failureReason: `Verification failed: ${verification.data?.message || 'Unknown error'}`,
                failedAt: new Date(),
              },
            );

            // 🎯 DISPATCH WEBHOOK EVENT: Payment failed
            const paymentEvent = WebhookEventBuilders.createPaymentFailedEvent(
              updatedPayment.id,
              updatedPayment.userId,
              updatedPayment.amount,
              verification.data?.message || 'Verification failed',
            );
            await WebhookEndpointManager.dispatchEvent(paymentEvent);

            apiLogger.warn('Payment verification failed with webhook events', {
              operation: 'payment_verification_failed',
              paymentId: paymentRecord.id,
              verificationMessage: verification.data?.message,
              webhookEventsDispatched: true,
            });

            processed = true;
          }
        } catch (verificationError) {
          apiLogger.error('Payment verification error', {
            error: verificationError,
            paymentId: paymentRecord.id,
          });

          const updatedPayment = await billingRepositories.payments.updateStatus(
            paymentRecord.id,
            'failed',
            {
              failureReason: `Verification error: ${verificationError instanceof Error ? verificationError.message : 'Unknown error'}`,
              failedAt: new Date(),
            },
          );

          // 🎯 DISPATCH WEBHOOK EVENT: Payment failed due to error
          const paymentEvent = WebhookEventBuilders.createPaymentFailedEvent(
            updatedPayment.id,
            updatedPayment.userId,
            updatedPayment.amount,
            'Payment verification error',
          );
          await WebhookEndpointManager.dispatchEvent(paymentEvent);

          processed = true;
        }
      } else {
        // Payment failed from ZarinPal
        const updatedPayment = await billingRepositories.payments.updateStatus(
          paymentRecord.id,
          'failed',
          {
            failureReason: 'Payment failed (webhook notification)',
            failedAt: new Date(),
          },
        );

        // 🎯 DISPATCH WEBHOOK EVENT: Payment failed
        const paymentEvent = WebhookEventBuilders.createPaymentFailedEvent(
          updatedPayment.id,
          updatedPayment.userId,
          updatedPayment.amount,
          'Payment failed',
        );
        await WebhookEndpointManager.dispatchEvent(paymentEvent);

        apiLogger.info('Payment failed with webhook events', {
          operation: 'payment_webhook_failed',
          paymentId: paymentRecord.id,
          webhookEventsDispatched: true,
        });

        processed = true;
      }
    } else {
      apiLogger.warn('Payment not found for webhook authority', {
        operation: 'payment_not_found',
        authority: webhookPayload.authority,
      });
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

      const fetchConfig: FetchConfig = {
        timeoutMs: 15000,
        maxRetries: 2,
        correlationId: crypto.randomUUID(),
      };

      const fetchResult = await postJSON(c.env.EXTERNAL_WEBHOOK_URL, forwardPayload, fetchConfig, {
        'X-Webhook-Source': 'billing-dashboard',
        'X-Event-ID': eventId,
      });

      forwarded = fetchResult.success;

      await db
        .update(webhookEvent)
        .set({
          forwardedToExternal: forwarded,
          forwardedAt: forwarded ? new Date() : null,
          forwardingError: forwarded ? null : (!fetchResult.success ? (fetchResult as { error?: string }).error || 'Unknown error' : 'Unknown error'),
        })
        .where(eq(webhookEvent.id, eventId));
    } catch (forwardError) {
      apiLogger.error('Failed to forward webhook', { error: forwardError });

      await db
        .update(webhookEvent)
        .set({
          forwardedToExternal: false,
          forwardingError: forwardError instanceof Error ? forwardError.message : 'Unknown error',
        })
        .where(eq(webhookEvent.id, eventId));
    }
  }

  return c.json({
    success: true,
    data: {
      received: true,
      eventId,
      processed,
      forwarded,
      webhook_events_dispatched: processed,
    },
  }, HttpStatusCodes.OK);
};

/**
 * Get webhook events handler
 */
export const getWebhookEventsHandler: RouteHandler<typeof getWebhookEventsRoute, ApiEnv> = async (c) => {
  const { source, processed, limit, offset } = c.req.valid('query');

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

  return c.json({
    success: true,
    data: transformedEvents,
  }, HttpStatusCodes.OK);
};

/**
 * Test webhook handler
 */
export const testWebhookHandler: RouteHandler<typeof testWebhookRoute, ApiEnv> = async (c) => {
  const { url, payload } = c.req.valid('json');

  const testPayload = payload || {
    test: true,
    timestamp: new Date().toISOString(),
    message: 'Test webhook from billing dashboard',
  };

  const fetchConfig: FetchConfig = {
    timeoutMs: 10000,
    maxRetries: 1,
    correlationId: crypto.randomUUID(),
  };

  const startTime = Date.now();
  const fetchResult = await postJSON(url, testPayload, fetchConfig, {
    'X-Webhook-Source': 'billing-dashboard-test',
    'X-Test-Webhook': 'true',
  });
  const responseTime = Date.now() - startTime;

  const success = fetchResult.success;
  let error: string | undefined;

  if (!success) {
    error = fetchResult.error || 'Unknown error';
  }

  return c.json({
    success: true,
    data: {
      success,
      statusCode: fetchResult.response?.status || 0,
      responseTime,
      error,
    },
  }, HttpStatusCodes.OK);
};
