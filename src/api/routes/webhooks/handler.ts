/**
 * Enhanced Webhook System Handler
 *
 * Comprehensive webhook processing with unified createHandler pattern.
 * Enhanced for seamless ZarinPal to Stripe webhook translation.
 * Features: Multiple endpoints, retry logic, Stripe compatibility.
 */

import crypto from 'node:crypto';

import type { RouteHandler } from '@hono/zod-openapi';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { createError } from '@/api/common/error-handling';
import type { FetchConfig } from '@/api/common/fetch-utilities';
import { postJSON } from '@/api/common/fetch-utilities';
import { createHandlerWithBatch, Responses } from '@/api/core';
import { apiLogger } from '@/api/middleware/hono-logger';
import { ZarinPalService } from '@/api/services/zarinpal';
import type { ApiEnv } from '@/api/types';
import { payment, product, subscription, webhookEvent } from '@/db/tables/billing';

import type {
  zarinPalWebhookRoute,
} from './route';

// ============================================================================
// WEBHOOK EVENT SCHEMAS (CONTEXT7 PATTERN)
// ============================================================================

/**
 * Discriminated union for webhook events (Context7 Pattern)
 * Maximum type safety replacing Record<string, unknown>
 * Includes all Stripe event types needed for complete compatibility
 */
const StripeWebhookEventSchema = z.discriminatedUnion('type', [
  // Payment Intent Succeeded - Matches Stripe format exactly
  z.object({
    id: z.string().startsWith('evt_'),
    object: z.literal('event'),
    type: z.literal('payment_intent.succeeded'),
    created: z.number().int().positive(),
    data: z.object({
      object: z.object({
        id: z.string(),
        object: z.literal('payment_intent'),
        amount: z.number().int().positive(),
        currency: z.literal('irr'),
        customer: z.string().startsWith('cus_'),
        status: z.literal('succeeded'),
        payment_method: z.string().optional(),
        description: z.string().optional(),
        created: z.number().int().positive(),
        metadata: z.record(z.string(), z.string()),
      }),
    }),
    livemode: z.boolean(),
    api_version: z.string(),
  }),
  // Payment Intent Failed - Matches Stripe format exactly
  z.object({
    id: z.string().startsWith('evt_'),
    object: z.literal('event'),
    type: z.literal('payment_intent.payment_failed'),
    created: z.number().int().positive(),
    data: z.object({
      object: z.object({
        id: z.string(),
        object: z.literal('payment_intent'),
        amount: z.number().int().positive(),
        currency: z.literal('irr'),
        customer: z.string().startsWith('cus_'),
        status: z.literal('payment_failed'),
        payment_method: z.string().optional(),
        last_payment_error: z.object({
          code: z.string(),
          message: z.string(),
          type: z.literal('api_error'),
          decline_code: z.string().optional(),
        }).optional(),
        created: z.number().int().positive(),
        metadata: z.record(z.string(), z.string()),
      }),
    }),
    livemode: z.boolean(),
    api_version: z.string(),
  }),
  // Customer Subscription Created
  z.object({
    type: z.literal('customer.subscription.created'),
    id: z.string(),
    object: z.literal('event'),
    created: z.number().int().positive(),
    data: z.object({
      object: z.object({
        id: z.string(),
        object: z.literal('subscription'),
        customer: z.string(),
        status: z.enum(['active', 'trialing']),
        created: z.number().int().positive(),
        metadata: z.record(z.string(), z.string()),
      }),
    }),
    livemode: z.boolean(),
    api_version: z.string(),
  }),
  // Customer Subscription Updated
  z.object({
    type: z.literal('customer.subscription.updated'),
    id: z.string(),
    object: z.literal('event'),
    created: z.number().int().positive(),
    data: z.object({
      object: z.object({
        id: z.string(),
        object: z.literal('subscription'),
        customer: z.string(),
        status: z.enum(['active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid', 'paused']),
        created: z.number().int().positive(),
        metadata: z.record(z.string(), z.string()),
      }),
    }),
    livemode: z.boolean(),
    api_version: z.string(),
  }),
  // Customer Subscription Deleted
  z.object({
    type: z.literal('customer.subscription.deleted'),
    id: z.string(),
    object: z.literal('event'),
    created: z.number().int().positive(),
    data: z.object({
      object: z.object({
        id: z.string(),
        object: z.literal('subscription'),
        customer: z.string(),
        status: z.literal('canceled'),
        created: z.number().int().positive(),
        canceled_at: z.number().int().positive(),
        metadata: z.record(z.string(), z.string()),
      }),
    }),
    livemode: z.boolean(),
    api_version: z.string(),
  }),
  // Checkout Session Completed
  z.object({
    type: z.literal('checkout.session.completed'),
    id: z.string(),
    object: z.literal('event'),
    created: z.number().int().positive(),
    data: z.object({
      object: z.object({
        id: z.string(),
        object: z.literal('checkout.session'),
        customer: z.string(),
        subscription: z.string(),
        client_reference_id: z.string(),
        line_items: z.object({
          data: z.array(z.object({
            price: z.object({
              id: z.string(),
            }),
          })),
        }),
        metadata: z.record(z.string(), z.string()),
      }),
    }),
    livemode: z.boolean(),
    api_version: z.string(),
  }),
  // Invoice Payment Succeeded
  z.object({
    type: z.literal('invoice.payment_succeeded'),
    id: z.string(),
    object: z.literal('event'),
    created: z.number().int().positive(),
    data: z.object({
      object: z.object({
        id: z.string(),
        object: z.literal('invoice'),
        customer: z.string(),
        subscription: z.string(),
        amount_paid: z.number().int().positive(),
        currency: z.literal('irr'),
        status: z.literal('paid'),
        paid: z.literal(true),
        created: z.number().int().positive(),
        metadata: z.record(z.string(), z.string()),
      }),
    }),
    livemode: z.boolean(),
    api_version: z.string(),
  }),
  // Invoice Payment Failed
  z.object({
    type: z.literal('invoice.payment_failed'),
    id: z.string(),
    object: z.literal('event'),
    created: z.number().int().positive(),
    data: z.object({
      object: z.object({
        id: z.string(),
        object: z.literal('invoice'),
        customer: z.string(),
        subscription: z.string(),
        amount_due: z.number().int().positive(),
        currency: z.literal('irr'),
        status: z.literal('open'),
        paid: z.literal(false),
        payment_intent: z.object({
          id: z.string(),
          last_payment_error: z.object({
            code: z.string(),
            message: z.string(),
            type: z.string(),
          }).optional(),
        }),
        created: z.number().int().positive(),
        metadata: z.record(z.string(), z.string()),
      }),
    }),
    livemode: z.boolean(),
    api_version: z.string(),
  }),
  // Setup Intent Succeeded
  z.object({
    type: z.literal('setup_intent.succeeded'),
    id: z.string(),
    object: z.literal('event'),
    created: z.number().int().positive(),
    data: z.object({
      object: z.object({
        id: z.string(),
        object: z.literal('setup_intent'),
        customer: z.string(),
        payment_method: z.string(),
        status: z.literal('succeeded'),
        usage: z.literal('off_session'),
        created: z.number().int().positive(),
        metadata: z.record(z.string(), z.string()),
      }),
    }),
    livemode: z.boolean(),
    api_version: z.string(),
  }),
]);

type WebhookEvent = z.infer<typeof StripeWebhookEventSchema>;

// ============================================================================
// WEBHOOK EVENT BUILDERS (TYPE-SAFE VERSION)
// ============================================================================

/**
 * Type-safe webhook event builders for common billing events
 */
export class WebhookEventBuilders {
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

  static createPaymentSucceededEvent(paymentId: string, customerId: string, amount: number, metadata?: Record<string, string>, paymentMethodId?: string): WebhookEvent {
    const event = {
      id: this.generateEventId(),
      object: 'event' as const,
      type: 'payment_intent.succeeded' as const,
      created: this.toUnixTimestamp(new Date()),
      data: {
        object: {
          id: paymentId,
          object: 'payment_intent' as const,
          amount: Math.round(amount),
          currency: 'irr' as const,
          customer: customerId,
          status: 'succeeded' as const,
          payment_method: paymentMethodId,
          description: `Payment for subscription ${metadata?.subscriptionId || ''}`.trim(),
          created: this.toUnixTimestamp(new Date()),
          metadata: metadata || {},
        },
      },
      livemode: process.env.NODE_ENV === 'production',
      api_version: '2024-01-01',
    };

    const validation = StripeWebhookEventSchema.safeParse(event);
    if (!validation.success) {
      throw new Error(`Invalid webhook event schema: ${validation.error.message}`);
    }
    return validation.data;
  }

  static createPaymentFailedEvent(paymentId: string, customerId: string, amount: number, errorMessage?: string, metadata?: Record<string, string>, paymentMethodId?: string): WebhookEvent {
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
          payment_method: paymentMethodId,
          last_payment_error: errorMessage
            ? {
                code: 'payment_failed',
                message: errorMessage,
                type: 'api_error' as const,
                decline_code: 'generic_decline',
              }
            : undefined,
          created: this.toUnixTimestamp(new Date()),
          metadata: metadata || {},
        },
      },
      livemode: process.env.NODE_ENV === 'production',
      api_version: '2024-01-01',
    };

    const validation = StripeWebhookEventSchema.safeParse(event);
    if (!validation.success) {
      throw new Error(`Invalid webhook event schema: ${validation.error.message}`);
    }
    return validation.data;
  }

  static createSubscriptionUpdatedEvent(subscriptionId: string, customerId: string, status: string, metadata?: Record<string, string>, planDetails?: { id: string; amount: number; interval: 'month' | 'year' }): WebhookEvent {
    const event = {
      id: this.generateEventId(),
      object: 'event' as const,
      type: 'customer.subscription.updated' as const,
      created: this.toUnixTimestamp(new Date()),
      data: {
        object: {
          id: subscriptionId,
          object: 'subscription' as const,
          customer: customerId,
          status: status as 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid' | 'paused',
          current_period_start: this.toUnixTimestamp(new Date()),
          current_period_end: planDetails?.interval === 'month'
            ? this.toUnixTimestamp(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
            : this.toUnixTimestamp(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
          plan: planDetails,
          created: this.toUnixTimestamp(new Date()),
          metadata: metadata || {},
        },
      },
      livemode: process.env.NODE_ENV === 'production',
      api_version: '2024-01-01',
    };

    const validation = StripeWebhookEventSchema.safeParse(event);
    if (!validation.success) {
      throw new Error(`Invalid webhook event schema: ${validation.error.message}`);
    }
    return validation.data;
  }

  /**
   * Create customer subscription created event
   */
  static createCustomerSubscriptionCreatedEvent(subscriptionId: string, customerId: string, metadata?: Record<string, string>): WebhookEvent {
    const event = {
      id: this.generateEventId(),
      object: 'event' as const,
      type: 'customer.subscription.created' as const,
      created: this.toUnixTimestamp(new Date()),
      data: {
        object: {
          id: subscriptionId,
          object: 'subscription' as const,
          customer: customerId,
          status: 'active' as const,
          created: this.toUnixTimestamp(new Date()),
          metadata: metadata || {},
        },
      },
      livemode: process.env.NODE_ENV === 'production',
      api_version: '2024-01-01',
    };

    const validation = StripeWebhookEventSchema.safeParse(event);
    if (!validation.success) {
      throw new Error(`Invalid webhook event schema: ${validation.error.message}`);
    }
    return validation.data;
  }

  /**
   * Create customer subscription deleted event - for cancellations
   */
  static createCustomerSubscriptionDeletedEvent(subscriptionId: string, customerId: string, metadata?: Record<string, string>): WebhookEvent {
    const event = {
      id: this.generateEventId(),
      object: 'event' as const,
      type: 'customer.subscription.deleted' as const,
      created: this.toUnixTimestamp(new Date()),
      data: {
        object: {
          id: subscriptionId,
          object: 'subscription' as const,
          customer: customerId,
          status: 'canceled' as const,
          created: this.toUnixTimestamp(new Date()),
          canceled_at: this.toUnixTimestamp(new Date()),
          metadata: metadata || {},
        },
      },
      livemode: process.env.NODE_ENV === 'production',
      api_version: '2024-01-01',
    };

    return event as WebhookEvent;
  }

  /**
   * Create checkout session completed event - for initial subscriptions
   */
  static createCheckoutSessionCompletedEvent(
    sessionId: string,
    customerId: string,
    subscriptionId: string,
    priceId: string,
    clientReferenceId: string,
    metadata?: Record<string, string>,
  ): WebhookEvent {
    const event = {
      id: this.generateEventId(),
      object: 'event' as const,
      type: 'checkout.session.completed' as const,
      created: this.toUnixTimestamp(new Date()),
      data: {
        object: {
          id: sessionId,
          object: 'checkout.session' as const,
          customer: customerId,
          subscription: subscriptionId,
          client_reference_id: clientReferenceId,
          line_items: {
            data: [{
              price: {
                id: priceId,
              },
            }],
          },
          metadata: metadata || {},
        },
      },
      livemode: process.env.NODE_ENV === 'production',
      api_version: '2024-01-01',
    };

    return event as WebhookEvent;
  }

  /**
   * Create invoice payment succeeded event - for recurring payments
   */
  static createInvoicePaymentSucceededEvent(
    invoiceId: string,
    customerId: string,
    subscriptionId: string,
    amount: number,
    metadata?: Record<string, string>,
  ): WebhookEvent {
    const event = {
      id: this.generateEventId(),
      object: 'event' as const,
      type: 'invoice.payment_succeeded' as const,
      created: this.toUnixTimestamp(new Date()),
      data: {
        object: {
          id: invoiceId,
          object: 'invoice' as const,
          customer: customerId,
          subscription: subscriptionId,
          amount_paid: Math.round(amount),
          currency: 'irr' as const,
          status: 'paid' as const,
          paid: true,
          created: this.toUnixTimestamp(new Date()),
          metadata: metadata || {},
        },
      },
      livemode: process.env.NODE_ENV === 'production',
      api_version: '2024-01-01',
    };

    return event as WebhookEvent;
  }

  /**
   * Create invoice payment failed event - for failed recurring payments
   */
  static createInvoicePaymentFailedEvent(
    invoiceId: string,
    customerId: string,
    subscriptionId: string,
    amount: number,
    errorMessage?: string,
    metadata?: Record<string, string>,
  ): WebhookEvent {
    const event = {
      id: this.generateEventId(),
      object: 'event' as const,
      type: 'invoice.payment_failed' as const,
      created: this.toUnixTimestamp(new Date()),
      data: {
        object: {
          id: invoiceId,
          object: 'invoice' as const,
          customer: customerId,
          subscription: subscriptionId,
          amount_due: Math.round(amount),
          currency: 'irr' as const,
          status: 'open' as const,
          paid: false,
          payment_intent: {
            id: `pi_${crypto.randomUUID().replace(/-/g, '')}`,
            last_payment_error: errorMessage
              ? {
                  code: 'card_declined',
                  message: errorMessage,
                  type: 'card_error',
                }
              : undefined,
          },
          created: this.toUnixTimestamp(new Date()),
          metadata: metadata || {},
        },
      },
      livemode: process.env.NODE_ENV === 'production',
      api_version: '2024-01-01',
    };

    return event as WebhookEvent;
  }

  /**
   * Create setup intent succeeded event - for payment method setup
   */
  static createSetupIntentSucceededEvent(
    setupIntentId: string,
    customerId: string,
    paymentMethodId: string,
    metadata?: Record<string, string>,
  ): WebhookEvent {
    const event = {
      id: this.generateEventId(),
      object: 'event' as const,
      type: 'setup_intent.succeeded' as const,
      created: this.toUnixTimestamp(new Date()),
      data: {
        object: {
          id: setupIntentId,
          object: 'setup_intent' as const,
          customer: customerId,
          payment_method: paymentMethodId,
          status: 'succeeded' as const,
          usage: 'off_session' as const,
          created: this.toUnixTimestamp(new Date()),
          metadata: metadata || {},
        },
      },
      livemode: process.env.NODE_ENV === 'production',
      api_version: '2024-01-01',
    };

    return event as WebhookEvent;
  }

  /**
   * Generate virtual Stripe customer ID for compatibility using email
   */
  static generateVirtualStripeCustomerId(userEmail: string): string {
    // Create deterministic virtual customer ID that looks like Stripe format using email
    const hash = crypto.createHash('sha256').update(`billing_${userEmail}`).digest('hex').substring(0, 24);
    return `cus_${hash}`;
  }

  /**
   * Generate client reference ID from user email for Roundtable correlation
   */
  static generateClientReferenceId(userEmail: string): string {
    // Use email as client reference for Roundtable to correlate users
    return userEmail;
  }
}

// ============================================================================
// WEBHOOK ENDPOINT MANAGEMENT (SIMPLIFIED INLINE VERSION)
// ============================================================================

/**
 * Roundtable Webhook Forwarder
 * Handles forwarding billing events to the Roundtable application
 */
export class RoundtableWebhookForwarder {
  private static getRoundtableWebhookUrl(): string | null {
    try {
      const { env } = getCloudflareContext();
      return env.NEXT_PUBLIC_ROUNDTABLE_WEBHOOK_URL || process.env.NEXT_PUBLIC_ROUNDTABLE_WEBHOOK_URL || null;
    } catch {
      return process.env.NEXT_PUBLIC_ROUNDTABLE_WEBHOOK_URL || null;
    }
  }

  private static getWebhookSecret(): string {
    try {
      const { env } = getCloudflareContext();
      return env.WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || 'default-secret';
    } catch {
      return process.env.WEBHOOK_SECRET || 'default-secret';
    }
  }

  private static getSupabaseAuthToken(): string | null {
    try {
      const { env } = getCloudflareContext();
      return env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
    } catch {
      return process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
    }
  }

  static async forwardEvent(event: WebhookEvent): Promise<boolean> {
    const url = this.getRoundtableWebhookUrl();
    if (!url) {
      apiLogger.info('No Roundtable webhook URL configured', {
        logType: 'api' as const,
        method: 'POST' as const,
        path: '/webhooks/roundtable',
        responseSize: 0,
      });
      return false;
    }

    const secret = this.getWebhookSecret();
    const payload = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(payload, secret, timestamp);

    const authToken = this.getSupabaseAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'BillingDashboard-Webhooks/1.0',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': timestamp.toString(),
      'X-Webhook-Event-Type': event.type,
      'X-Webhook-Event-Id': event.id,
      'X-Webhook-Source': 'billing-dashboard',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    };

    const fetchConfig: FetchConfig = {
      timeoutMs: 15000,
      maxRetries: 3,
      correlationId: `roundtable-webhook-${event.id}`,
    };

    try {
      const startTime = Date.now();
      const result = await postJSON(url, event, fetchConfig, headers);
      const duration = Date.now() - startTime;

      if (result.success) {
        apiLogger.info('Roundtable webhook delivered successfully', {
          logType: 'api' as const,
          method: 'POST' as const,
          path: url,
          statusCode: result.response?.status,
          duration,
          eventType: event.type,
        });
        return true;
      } else {
        apiLogger.error('Roundtable webhook delivery failed', {
          logType: 'api' as const,
          method: 'POST' as const,
          path: url,
          statusCode: result.response?.status,
          error: result.error,
          eventType: event.type,
        });
        return false;
      }
    } catch (error) {
      apiLogger.error('Roundtable webhook delivery error', {
        logType: 'api' as const,
        method: 'POST' as const,
        path: url,
        error: error instanceof Error ? error.message : String(error),
        eventType: event.type,
      });
      return false;
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
      throw createError.rateLimit('Webhook rate limit exceeded');
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
    throw createError.unauthorized('Invalid webhook source');
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
      throw createError.unauthorized('Webhook timestamp validation failed');
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
      throw createError.unauthorized('Webhook request from unauthorized IP');
    }
  }

  // Content-Type validation
  const contentType = c.req.header('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw createError.badRequest('Invalid content type for webhook');
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
 * Enhanced ZarinPal Webhook Handler with Event Dispatching - Refactored
 * Now uses unified createHandlerWithBatch pattern for optimal D1 performance
 */
export const zarinPalWebhookHandler: RouteHandler<typeof zarinPalWebhookRoute, ApiEnv> = createHandlerWithBatch(
  {
    auth: 'public', // Webhook comes from ZarinPal, not authenticated user
    validateBody: z.object({
      authority: z.string(),
      status: z.enum(['OK', 'NOK']),
      ref_id: z.string().optional(),
      card_hash: z.string().optional(),
      card_pan: z.string().optional(),
      fee: z.number().optional(),
      fee_type: z.string().optional(),
    }),
    operationName: 'zarinPalWebhook',
  },
  async (c, batch) => {
    // Enhanced security validation using our error handling pattern
    await validateWebhookSecurity(c);

    const webhookPayload = c.validated.body;

    c.logger.info('Processing webhook payload', {
      logType: 'operation',
      operationName: 'zarinPalWebhook',
      resource: webhookPayload.authority,
    });

    // Create webhook event record for audit trail
    const eventId = crypto.randomUUID();
    const eventRecord = {
      id: eventId,
      source: 'zarinpal',
      eventType: `payment.${webhookPayload.status === 'OK' ? 'completed' : 'failed'}`,
      rawPayload: webhookPayload,
      processed: false,
      forwardedToExternal: false,
      externalWebhookUrl: (() => {
        try {
          const { env } = getCloudflareContext();
          return env.NEXT_PUBLIC_ROUNDTABLE_WEBHOOK_URL || null;
        } catch {
          return process.env.NEXT_PUBLIC_ROUNDTABLE_WEBHOOK_URL || null;
        }
      })(),
    };

    // Add webhook event to batch
    batch.add(
      batch.db.insert(webhookEvent).values({
        ...eventRecord,
        id: eventId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    let paymentRecord = null;
    let subscriptionRecord = null;
    let processed = false;

    // Find payment by authority (read operation - doesn't go in batch)
    if (webhookPayload.authority) {
      const paymentResults = await batch.db
        .select()
        .from(payment)
        .where(eq(payment.zarinpalAuthority, webhookPayload.authority))
        .limit(1);
      paymentRecord = paymentResults[0];

      if (paymentRecord) {
        // Get subscription if exists (read operation)
        if (paymentRecord.subscriptionId) {
          const subscriptionResults = await batch.db
            .select()
            .from(subscription)
            .where(eq(subscription.id, paymentRecord.subscriptionId))
            .limit(1);
          subscriptionRecord = subscriptionResults[0];
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
              // Update payment record (add to batch)
              batch.add(
                batch.db.update(payment)
                  .set({
                    status: 'completed',
                    zarinpalRefId: verification.data?.ref_id?.toString() || webhookPayload.ref_id,
                    zarinpalCardHash: verification.data?.card_hash || webhookPayload.card_hash,
                    paidAt: new Date(),
                    updatedAt: new Date(),
                  })
                  .where(eq(payment.id, paymentRecord.id)),
              );

              // For webhook forwarding, use existing payment data with updated fields
              const updatedPayment = {
                ...paymentRecord,
                status: 'completed',
                zarinpalRefId: verification.data?.ref_id?.toString() || webhookPayload.ref_id,
                zarinpalCardHash: verification.data?.card_hash || webhookPayload.card_hash,
                paidAt: new Date(),
                updatedAt: new Date(),
              };

              // Get product details and user details for metadata (read operations)
              const productResults = await batch.db
                .select()
                .from(product)
                .where(eq(product.id, updatedPayment.productId))
                .limit(1);
              const productRecord = productResults[0];

              // Get user details for email mapping
              const { user } = await import('@/db/tables/auth');
              const userResults = await batch.db
                .select({ email: user.email })
                .from(user)
                .where(eq(user.id, updatedPayment.userId))
                .limit(1);
              const userRecord = userResults[0];

              // DISPATCH WEBHOOK EVENT: Payment succeeded (EMAIL-BASED)
              const userEmail = userRecord?.email || '';
              const paymentEvent = WebhookEventBuilders.createPaymentSucceededEvent(
                updatedPayment.id,
                WebhookEventBuilders.generateVirtualStripeCustomerId(userEmail), // Use email for customer ID
                updatedPayment.amount,
                {
                  subscriptionId: paymentRecord.subscriptionId || '',
                  zarinpalRefId: verification.data?.ref_id?.toString() || '',
                  zarinpalAuthority: webhookPayload.authority,
                  billingUserId: updatedPayment.userId,
                  userEmail, // Primary identifier for Roundtable
                  productId: updatedPayment.productId,
                  productName: productRecord?.name || '',
                  planName: (productRecord?.metadata as Record<string, unknown>)?.roundtable_plan_name as string || productRecord?.name || 'Pro',
                  roundtableProductId: productRecord?.roundtableId || '',
                  stripePriceId: productRecord?.stripePriceId || '',
                },
                verification.data?.card_hash || webhookPayload.card_hash, // payment method ID
              );
              await RoundtableWebhookForwarder.forwardEvent(paymentEvent);

              // Update subscription if exists
              if (paymentRecord.subscriptionId && subscriptionRecord) {
                if (subscriptionRecord.status === 'pending') {
                  const startDate = new Date();
                  const nextBillingDate = subscriptionRecord.billingPeriod === 'monthly'
                    ? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
                    : null;

                  // Add subscription update to batch
                  batch.add(
                    batch.db.update(subscription)
                      .set({
                        status: 'active',
                        startDate,
                        nextBillingDate,
                        directDebitContractId: verification.data?.card_hash || webhookPayload.card_hash,
                        updatedAt: new Date(),
                      })
                      .where(eq(subscription.id, subscriptionRecord.id)),
                  );

                  // Use updated subscription data for webhook forwarding
                  const updatedSubscription = {
                    ...subscriptionRecord,
                    status: 'active',
                    startDate,
                    nextBillingDate,
                    directDebitContractId: verification.data?.card_hash || webhookPayload.card_hash,
                    updatedAt: new Date(),
                  };

                  // DISPATCH WEBHOOK EVENT: Subscription activated (EMAIL-BASED)
                  const subscriptionEvent = WebhookEventBuilders.createSubscriptionUpdatedEvent(
                    updatedSubscription.id,
                    WebhookEventBuilders.generateVirtualStripeCustomerId(userEmail), // Use email for customer ID
                    'active',
                    {
                      billingUserId: updatedPayment.userId,
                      userEmail, // Primary identifier for Roundtable
                      paymentId: updatedPayment.id,
                      zarinpalContractId: verification.data?.card_hash || webhookPayload.card_hash || '',
                      productId: updatedPayment.productId,
                      productName: productRecord?.name || '',
                      planName: (productRecord?.metadata as Record<string, unknown>)?.roundtable_plan_name as string || productRecord?.name || 'Pro',
                      roundtableProductId: productRecord?.roundtableId || '',
                    },
                    {
                      id: `plan_${subscriptionRecord.productId}`,
                      amount: updatedPayment.amount,
                      interval: subscriptionRecord.billingPeriod === 'monthly' ? 'month' : 'year',
                    },
                  );
                  await RoundtableWebhookForwarder.forwardEvent(subscriptionEvent);

                  // Also dispatch customer.subscription.created for new subscriptions
                  if (subscriptionRecord.status === 'pending') {
                    const customerSubEvent = WebhookEventBuilders.createCustomerSubscriptionCreatedEvent(
                      updatedSubscription.id,
                      WebhookEventBuilders.generateVirtualStripeCustomerId(userEmail), // Use email for customer ID
                      {
                        billingUserId: updatedPayment.userId,
                        userEmail, // Primary identifier for Roundtable
                        productId: subscriptionRecord.productId || '',
                        plan: subscriptionRecord.billingPeriod || 'monthly',
                        productName: productRecord?.name || '',
                        planName: (productRecord?.metadata as Record<string, unknown>)?.roundtable_plan_name as string || productRecord?.name || 'Pro',
                        roundtableProductId: productRecord?.roundtableId || '',
                      },
                    );
                    await RoundtableWebhookForwarder.forwardEvent(customerSubEvent);
                  }

                  subscriptionRecord = updatedSubscription;
                }
              }

              // Roundtable webhook events have been forwarded

              apiLogger.info('Payment verified and webhook events dispatched', {
                operation: 'payment_verification_success',
                paymentId: paymentRecord.id,
                zarinpalRefId: verification.data?.ref_id,
                subscriptionId: paymentRecord.subscriptionId,
                webhookEventsDispatched: true,
              });

              processed = true;
            } else {
              // Verification failed - add update to batch
              batch.add(
                batch.db.update(payment)
                  .set({
                    status: 'failed',
                    failureReason: `Verification failed: ${verification.data?.message || 'Unknown error'}`,
                    failedAt: new Date(),
                    updatedAt: new Date(),
                  })
                  .where(eq(payment.id, paymentRecord.id)),
              );

              // Use updated payment data for webhook forwarding
              const updatedPayment = {
                ...paymentRecord,
                status: 'failed',
                failureReason: `Verification failed: ${verification.data?.message || 'Unknown error'}`,
                failedAt: new Date(),
                updatedAt: new Date(),
              };

              // DISPATCH WEBHOOK EVENT: Payment failed
              const paymentEvent = WebhookEventBuilders.createPaymentFailedEvent(
                updatedPayment.id,
                WebhookEventBuilders.generateVirtualStripeCustomerId(updatedPayment.userId),
                updatedPayment.amount,
                verification.data?.message || 'Verification failed',
                {
                  subscriptionId: paymentRecord.subscriptionId || '',
                  zarinpalAuthority: webhookPayload.authority,
                  billingUserId: updatedPayment.userId,
                  verificationCode: verification.data?.code?.toString() || '',
                },
                verification.data?.card_hash || webhookPayload.card_hash,
              );
              await RoundtableWebhookForwarder.forwardEvent(paymentEvent);

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

            // Add payment failure update to batch
            batch.add(
              batch.db.update(payment)
                .set({
                  status: 'failed',
                  failureReason: `Verification error: ${verificationError instanceof Error ? verificationError.message : 'Unknown error'}`,
                  failedAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(payment.id, paymentRecord.id)),
            );

            // Use updated payment data for webhook forwarding
            const updatedPayment = {
              ...paymentRecord,
              status: 'failed',
              failureReason: `Verification error: ${verificationError instanceof Error ? verificationError.message : 'Unknown error'}`,
              failedAt: new Date(),
              updatedAt: new Date(),
            };

            // DISPATCH WEBHOOK EVENT: Payment failed due to error
            const paymentEvent = WebhookEventBuilders.createPaymentFailedEvent(
              updatedPayment.id,
              WebhookEventBuilders.generateVirtualStripeCustomerId(updatedPayment.userId),
              updatedPayment.amount,
              'Payment verification error',
              {
                subscriptionId: paymentRecord.subscriptionId || '',
                zarinpalAuthority: webhookPayload.authority,
                billingUserId: updatedPayment.userId,
                errorType: 'verification_error',
              },
            );
            await RoundtableWebhookForwarder.forwardEvent(paymentEvent);

            processed = true;
          }
        } else {
          // Payment failed from ZarinPal - add update to batch
          batch.add(
            batch.db.update(payment)
              .set({
                status: 'failed',
                failureReason: 'Payment was canceled or failed by user',
                failedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(payment.id, paymentRecord.id)),
          );

          // Use updated payment data for webhook forwarding
          const updatedPayment = {
            ...paymentRecord,
            status: 'failed',
            failureReason: 'Payment was canceled or failed by user',
            failedAt: new Date(),
            updatedAt: new Date(),
          };

          // DISPATCH WEBHOOK EVENT: Payment failed
          const paymentEvent = WebhookEventBuilders.createPaymentFailedEvent(
            updatedPayment.id,
            WebhookEventBuilders.generateVirtualStripeCustomerId(updatedPayment.userId),
            updatedPayment.amount,
            'Payment failed',
            {
              subscriptionId: paymentRecord.subscriptionId || '',
              zarinpalAuthority: webhookPayload.authority,
              billingUserId: updatedPayment.userId,
              errorType: 'user_cancelled',
              zarinpalStatus: webhookPayload.status,
            },
          );
          await RoundtableWebhookForwarder.forwardEvent(paymentEvent);

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
    batch.add(
      batch.db.update(webhookEvent)
        .set({
          processed,
          processedAt: processed ? new Date() : null,
          paymentId: paymentRecord?.id || null,
        })
        .where(eq(webhookEvent.id, eventId)),
    );

    // Execute all batch operations atomically
    await batch.execute();

    // Webhook processing completed with Roundtable forwarding
    // Events are forwarded when processed - using 'processed' variable to track success

    return Responses.ok(c, {
      received: true,
      eventId,
      processed,
      webhook_events_dispatched: processed,
    });
  },
);
