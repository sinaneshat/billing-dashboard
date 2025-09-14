/**
 * Enhanced Webhook System Handler - Roundtable Integration
 *
 * Comprehensive webhook processing with unified createHandler pattern.
 * Enhanced for seamless ZarinPal to Stripe webhook translation for Roundtable integration.
 * Features: Multiple endpoints, retry logic, SSO user mapping, Stripe compatibility.
 */

import crypto from 'node:crypto';

import type { RouteHandler } from '@hono/zod-openapi';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { createError } from '@/api/common/error-handling';
import type { FetchConfig } from '@/api/common/fetch-utilities';
import { postJSON } from '@/api/common/fetch-utilities';
import { createHandler, createHandlerWithTransaction, Responses } from '@/api/core';
import { apiLogger } from '@/api/middleware/hono-logger';
import { ZarinPalService } from '@/api/services/zarinpal';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { payment, subscription, webhookEvent } from '@/db/tables/billing';

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
        status: z.enum(['active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid', 'paused']),
        created: z.number().int().positive(),
        metadata: z.record(z.string(), z.string()),
      }),
    }),
    livemode: z.boolean(),
    api_version: z.string(),
  }),
  // Customer Events
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
]);

/**
 * Enhanced Webhook Endpoint Configuration Schema
 * Supports multiple endpoints with different configurations
 */
const _WebhookEndpointConfigSchema = z.object({
  id: z.string(),
  name: z.string(), // 'roundtable_production', 'roundtable_staging'
  url: z.string().url(),
  enabled_events: z.array(z.string()),
  status: z.enum(['enabled', 'disabled']),
  secret: z.string(),
  maxRetries: z.number().int().min(0).default(3),
  timeoutMs: z.number().int().positive().default(15000),
  retryBackoffMs: z.number().int().positive().default(1000),
  created: z.number().int().positive(),
});

type WebhookEvent = z.infer<typeof StripeWebhookEventSchema>;
type WebhookEndpointConfig = z.infer<typeof _WebhookEndpointConfigSchema>;

/**
 * SSO User Mapping Interface for Roundtable Integration
 */
type SSORoundtableUserMapping = {
  billingUserId: string;
  roundtableUserId?: string;
  roundtableEmail?: string;
  virtualStripeCustomerId: string;
  ssoTokenHash?: string;
  lastSsoAt?: Date;
};

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
      type: 'subscription.updated' as const,
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
   * Create customer subscription created event for Roundtable
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
   * Map billing user to virtual Stripe customer ID for Roundtable compatibility
   */
  static generateVirtualStripeCustomerId(billingUserId: string): string {
    // Create deterministic virtual customer ID that looks like Stripe format
    const hash = crypto.createHash('sha256').update(`billing_${billingUserId}`).digest('hex').substring(0, 24);
    return `cus_${hash}`;
  }

  /**
   * Create SSO user mapping for Roundtable integration
   */
  static createSSORoundtableUserMapping(billingUserId: string, roundtableUserId?: string, roundtableEmail?: string): SSORoundtableUserMapping {
    return {
      billingUserId,
      roundtableUserId,
      roundtableEmail,
      virtualStripeCustomerId: this.generateVirtualStripeCustomerId(billingUserId),
      lastSsoAt: new Date(),
    };
  }
}

// ============================================================================
// WEBHOOK ENDPOINT MANAGEMENT (SIMPLIFIED INLINE VERSION)
// ============================================================================

/**
 * Enhanced Webhook Endpoint Manager with Configuration-Based Multi-Endpoint Support
 * Supports environment-based configuration with retry logic and SSO user mapping
 */
class WebhookEndpointManager {
  private static getWebhookEndpoints(): WebhookEndpointConfig[] {
    const endpoints: WebhookEndpointConfig[] = [];

    // Main external webhook URL from environment
    if (process.env.NEXT_PUBLIC_EXTERNAL_WEBHOOK_URL) {
      endpoints.push({
        id: 'external-primary',
        name: 'External Primary Endpoint',
        url: process.env.NEXT_PUBLIC_EXTERNAL_WEBHOOK_URL,
        enabled_events: ['*'], // All events
        status: 'enabled',
        secret: process.env.WEBHOOK_SECRET || 'default-secret',
        maxRetries: 3,
        timeoutMs: 15000,
        retryBackoffMs: 1000,
        created: Date.now(),
      });
    }

    // Roundtable-specific endpoint
    if (process.env.NEXT_PUBLIC_ROUNDTABLE_APP_URL) {
      const roundtableWebhookUrl = `${process.env.NEXT_PUBLIC_ROUNDTABLE_APP_URL.replace(/\/$/, '')}/webhooks/zarinpal`;
      endpoints.push({
        id: 'roundtable-production',
        name: 'Roundtable Production',
        url: roundtableWebhookUrl,
        enabled_events: [
          'payment_intent.succeeded',
          'payment_intent.payment_failed',
          'subscription.updated',
          'customer.subscription.created',
        ],
        status: 'enabled',
        secret: process.env.SSO_SIGNING_SECRET || process.env.WEBHOOK_SECRET || 'default-secret',
        maxRetries: 5, // More retries for critical Roundtable integration
        timeoutMs: 20000,
        retryBackoffMs: 2000,
        created: Date.now(),
      });
    }

    return endpoints;
  }

  static async dispatchEvent(event: WebhookEvent, userMapping?: SSORoundtableUserMapping): Promise<void> {
    const endpoints = this.getWebhookEndpoints().filter(ep =>
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

    // Dispatch to all endpoints in parallel with enhanced error handling
    const results = await Promise.allSettled(
      endpoints.map(endpoint => this.deliverToEndpoint(endpoint, event, userMapping)),
    );

    // Log delivery summary
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    apiLogger.info('Webhook dispatch completed', {
      logType: 'api' as const,
      method: 'POST' as const,
      path: '/webhooks/dispatch',
      successful,
      failed,
      totalEndpoints: endpoints.length,
    });
  }

  private static async deliverToEndpoint(
    endpoint: WebhookEndpointConfig,
    event: WebhookEvent,
    userMapping?: SSORoundtableUserMapping,
  ): Promise<void> {
    const payload = this.preparePayloadForEndpoint(event, endpoint, userMapping);
    const payloadString = JSON.stringify(payload);

    let lastError: Error | null = null;
    const maxRetries = endpoint.maxRetries || 3;
    const baseBackoffMs = endpoint.retryBackoffMs || 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = this.generateSignature(payloadString, endpoint.secret, timestamp);

        const requestHeaders = {
          'Content-Type': 'application/json',
          'User-Agent': 'BillingDashboard-Webhooks/1.0',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp.toString(),
          'X-Webhook-Event-Type': event.type,
          'X-Webhook-Event-Id': event.id,
          'X-Webhook-Endpoint-Id': endpoint.id,
          // Add Roundtable-specific headers for SSO integration
          ...(userMapping && endpoint.id.includes('roundtable') && {
            'X-SSO-User-Id': userMapping.billingUserId,
            'X-Virtual-Customer-Id': userMapping.virtualStripeCustomerId,
          }),
        };

        const fetchConfig: FetchConfig = {
          timeoutMs: endpoint.timeoutMs || 15000,
          maxRetries: 1, // We handle retries manually for better control
          correlationId: `webhook-${event.id}-${endpoint.id}-${attempt}`,
        };

        const startTime = Date.now();
        const result = await postJSON(endpoint.url, payload, fetchConfig, requestHeaders);
        const duration = Date.now() - startTime;

        if (result.success) {
          apiLogger.info('Webhook delivered successfully', {
            logType: 'api' as const,
            method: 'POST' as const,
            path: endpoint.url,
            endpointId: endpoint.id,
            statusCode: result.response?.status,
            duration,
            attempt: attempt + 1,
            eventType: event.type,
          });
          return; // Success - exit retry loop
        } else {
          throw new Error(`HTTP ${result.response?.status || 'unknown'}: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const isLastAttempt = attempt === maxRetries;
        const statusCode = this.extractStatusCodeFromError(error);

        // Don't retry on certain HTTP status codes (4xx client errors except 408, 429)
        const shouldRetry = isLastAttempt ? false : this.shouldRetryDelivery(statusCode);

        if (shouldRetry && !isLastAttempt) {
          // Exponential backoff with jitter
          const backoffMs = baseBackoffMs * 2 ** attempt;
          const jitter = Math.random() * backoffMs * 0.1; // 10% jitter
          const delayMs = backoffMs + jitter;

          apiLogger.warn('Webhook delivery attempt failed, retrying', {
            logType: 'api' as const,
            method: 'POST' as const,
            path: endpoint.url,
            endpointId: endpoint.id,
            statusCode,
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            retryAfter: Math.round(delayMs),
            error: lastError.message,
          });

          await this.sleep(delayMs);
        } else {
          apiLogger.error('Webhook delivery failed permanently', {
            logType: 'api' as const,
            method: 'POST' as const,
            path: endpoint.url,
            endpointId: endpoint.id,
            statusCode,
            attempts: attempt + 1,
            error: lastError.message,
            eventType: event.type,
          });
          break; // Don't retry
        }
      }
    }

    // If we reach here, all attempts failed
    throw lastError || new Error('All delivery attempts failed');
  }

  /**
   * Prepare payload for specific endpoint (add Roundtable-specific transformations)
   */
  private static preparePayloadForEndpoint(
    event: WebhookEvent,
    endpoint: WebhookEndpointConfig,
    userMapping?: SSORoundtableUserMapping,
  ): WebhookEvent {
    // For non-Roundtable endpoints or no user mapping, return as-is
    if (!endpoint.id.includes('roundtable') || !userMapping) {
      return event;
    }

    // Handle each event type separately to maintain type safety
    switch (event.type) {
      case 'payment_intent.succeeded':
        return {
          ...event,
          data: {
            object: {
              ...event.data.object,
              customer: userMapping.virtualStripeCustomerId,
              metadata: {
                ...event.data.object.metadata,
                billing_user_id: userMapping.billingUserId,
                roundtable_user_id: userMapping.roundtableUserId || '',
                integration_source: 'zarinpal_direct_debit',
              },
            },
          },
        };

      case 'payment_intent.payment_failed':
        return {
          ...event,
          data: {
            object: {
              ...event.data.object,
              customer: userMapping.virtualStripeCustomerId,
              metadata: {
                ...event.data.object.metadata,
                billing_user_id: userMapping.billingUserId,
                roundtable_user_id: userMapping.roundtableUserId || '',
                integration_source: 'zarinpal_direct_debit',
              },
            },
          },
        };

      case 'subscription.updated':
        return {
          ...event,
          data: {
            object: {
              ...event.data.object,
              customer: userMapping.virtualStripeCustomerId,
              metadata: {
                ...event.data.object.metadata,
                billing_user_id: userMapping.billingUserId,
                roundtable_user_id: userMapping.roundtableUserId || '',
                integration_source: 'zarinpal_direct_debit',
              },
            },
          },
        };

      case 'customer.subscription.created':
        return {
          ...event,
          data: {
            object: {
              ...event.data.object,
              customer: userMapping.virtualStripeCustomerId,
              metadata: {
                ...event.data.object.metadata,
                billing_user_id: userMapping.billingUserId,
                roundtable_user_id: userMapping.roundtableUserId || '',
                integration_source: 'zarinpal_direct_debit',
              },
            },
          },
        };

      default:
        return event;
    }
  }

  /**
   * Determine if delivery should be retried based on status code
   */
  private static shouldRetryDelivery(statusCode?: number): boolean {
    if (!statusCode)
      return true; // Network errors should be retried

    // Retry on 5xx server errors and specific 4xx errors
    if (statusCode >= 500)
      return true;
    if (statusCode === 408)
      return true; // Request Timeout
    if (statusCode === 429)
      return true; // Rate Limited

    return false; // Don't retry on other 4xx client errors
  }

  /**
   * Extract HTTP status code from error
   */
  private static extractStatusCodeFromError(error: unknown): number | undefined {
    if (typeof error === 'object' && error !== null) {
      if ('status' in error && typeof error.status === 'number') {
        return error.status;
      }
      if ('response' in error
        && typeof error.response === 'object'
        && error.response !== null
        && 'status' in error.response
        && typeof error.response.status === 'number') {
        return error.response.status;
      }
    }
    return undefined;
  }

  /**
   * Sleep utility for retry delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
 * Now uses unified createHandlerWithTransaction pattern
 */
export const zarinPalWebhookHandler: RouteHandler<typeof zarinPalWebhookRoute, ApiEnv> = createHandlerWithTransaction(
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
  async (c, _tx) => {
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
      externalWebhookUrl: c.env?.NEXT_PUBLIC_EXTERNAL_WEBHOOK_URL || null,
    };

    try {
      await db.insert(webhookEvent).values({
        ...eventRecord,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      apiLogger.error('Failed to create webhook event record', { error });
    }

    let paymentRecord = null;
    let subscriptionRecord = null;
    let processed = false;

    // Find payment by authority
    if (webhookPayload.authority) {
      const paymentResults = await db.select().from(payment).where(eq(payment.zarinpalAuthority, webhookPayload.authority)).limit(1);
      paymentRecord = paymentResults[0];

      if (paymentRecord) {
      // Get subscription if exists
        if (paymentRecord.subscriptionId) {
          const subscriptionResults = await db.select().from(subscription).where(eq(subscription.id, paymentRecord.subscriptionId)).limit(1);
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
            // Update payment record using direct DB access
              await db.update(payment)
                .set({
                  status: 'completed',
                  zarinpalRefId: verification.data?.ref_id?.toString() || webhookPayload.ref_id,
                  zarinpalCardHash: verification.data?.card_hash || webhookPayload.card_hash,
                  paidAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(payment.id, paymentRecord.id));

              // Get updated payment record
              const updatedPaymentResults = await db.select().from(payment).where(eq(payment.id, paymentRecord.id)).limit(1);
              const updatedPayment = updatedPaymentResults[0];
              if (!updatedPayment) {
                throw new Error('Payment record not found after update');
              }

              // DISPATCH WEBHOOK EVENT: Payment succeeded
              // Create SSO user mapping for Roundtable integration
              const userMapping = WebhookEventBuilders.createSSORoundtableUserMapping(
                updatedPayment.userId,
                undefined, // roundtableUserId - to be populated via SSO
                undefined, // roundtableEmail - to be populated via SSO
              );

              const paymentEvent = WebhookEventBuilders.createPaymentSucceededEvent(
                updatedPayment.id,
                userMapping.virtualStripeCustomerId,
                updatedPayment.amount,
                {
                  subscriptionId: paymentRecord.subscriptionId || '',
                  zarinpalRefId: verification.data?.ref_id?.toString() || '',
                  zarinpalAuthority: webhookPayload.authority,
                  billingUserId: updatedPayment.userId,
                },
                verification.data?.card_hash || webhookPayload.card_hash, // payment method ID
              );
              await WebhookEndpointManager.dispatchEvent(paymentEvent, userMapping);

              // Update subscription if exists
              if (paymentRecord.subscriptionId && subscriptionRecord) {
                if (subscriptionRecord.status === 'pending') {
                  const startDate = new Date();
                  const nextBillingDate = subscriptionRecord.billingPeriod === 'monthly'
                    ? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
                    : null;

                  await db.update(subscription)
                    .set({
                      status: 'active',
                      startDate,
                      nextBillingDate,
                      directDebitContractId: verification.data?.card_hash || webhookPayload.card_hash,
                      updatedAt: new Date(),
                    })
                    .where(eq(subscription.id, subscriptionRecord.id));

                  // Get updated subscription record
                  const updatedSubscriptionResults = await db.select().from(subscription).where(eq(subscription.id, subscriptionRecord.id)).limit(1);
                  const updatedSubscription = updatedSubscriptionResults[0];
                  if (!updatedSubscription) {
                    throw new Error('Subscription record not found after update');
                  }

                  // DISPATCH WEBHOOK EVENT: Subscription activated
                  const subscriptionEvent = WebhookEventBuilders.createSubscriptionUpdatedEvent(
                    updatedSubscription.id,
                    userMapping.virtualStripeCustomerId,
                    'active',
                    {
                      billingUserId: updatedPayment.userId,
                      paymentId: updatedPayment.id,
                      zarinpalContractId: verification.data?.card_hash || webhookPayload.card_hash || '',
                    },
                    {
                      id: `plan_${subscriptionRecord.productId}`,
                      amount: updatedPayment.amount,
                      interval: subscriptionRecord.billingPeriod === 'monthly' ? 'month' : 'year',
                    },
                  );
                  await WebhookEndpointManager.dispatchEvent(subscriptionEvent, userMapping);

                  // Also dispatch customer.subscription.created for new subscriptions
                  if (subscriptionRecord.status === 'pending') {
                    const customerSubEvent = WebhookEventBuilders.createCustomerSubscriptionCreatedEvent(
                      updatedSubscription.id,
                      userMapping.virtualStripeCustomerId,
                      {
                        billingUserId: updatedPayment.userId,
                        productId: subscriptionRecord.productId || '',
                        plan: subscriptionRecord.billingPeriod || 'monthly',
                      },
                    );
                    await WebhookEndpointManager.dispatchEvent(customerSubEvent, userMapping);
                  }

                  subscriptionRecord = updatedSubscription;
                }
              }

              // Note: Roundtable integration was removed as part of cleanup.
              // Payment processing is now complete without external integrations.

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
              await db.update(payment)
                .set({
                  status: 'failed',
                  failureReason: `Verification failed: ${verification.data?.message || 'Unknown error'}`,
                  failedAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(payment.id, paymentRecord.id));

              // Get updated payment record
              const updatedPaymentResults = await db.select().from(payment).where(eq(payment.id, paymentRecord.id)).limit(1);
              const updatedPayment = updatedPaymentResults[0];
              if (!updatedPayment) {
                throw new Error('Payment record not found after update');
              }

              // DISPATCH WEBHOOK EVENT: Payment failed
              const userMapping = WebhookEventBuilders.createSSORoundtableUserMapping(
                updatedPayment.userId,
              );

              const paymentEvent = WebhookEventBuilders.createPaymentFailedEvent(
                updatedPayment.id,
                userMapping.virtualStripeCustomerId,
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
              await WebhookEndpointManager.dispatchEvent(paymentEvent, userMapping);

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

            await db.update(payment)
              .set({
                status: 'failed',
                failureReason: `Verification error: ${verificationError instanceof Error ? verificationError.message : 'Unknown error'}`,
                failedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(payment.id, paymentRecord.id));

            // Get updated payment record
            const updatedPaymentResults = await db.select().from(payment).where(eq(payment.id, paymentRecord.id)).limit(1);
            const updatedPayment = updatedPaymentResults[0];
            if (!updatedPayment) {
              throw new Error('Payment record not found after update');
            }

            // DISPATCH WEBHOOK EVENT: Payment failed due to error
            const userMapping = WebhookEventBuilders.createSSORoundtableUserMapping(
              updatedPayment.userId,
            );

            const paymentEvent = WebhookEventBuilders.createPaymentFailedEvent(
              updatedPayment.id,
              userMapping.virtualStripeCustomerId,
              updatedPayment.amount,
              'Payment verification error',
              {
                subscriptionId: paymentRecord.subscriptionId || '',
                zarinpalAuthority: webhookPayload.authority,
                billingUserId: updatedPayment.userId,
                errorType: 'verification_error',
              },
            );
            await WebhookEndpointManager.dispatchEvent(paymentEvent, userMapping);

            processed = true;
          }
        } else {
        // Payment failed from ZarinPal
          await db.update(payment)
            .set({
              status: 'failed',
              failureReason: 'Payment was canceled or failed by user',
              failedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(payment.id, paymentRecord.id));

          // Get updated payment record
          const updatedPaymentResults = await db.select().from(payment).where(eq(payment.id, paymentRecord.id)).limit(1);
          const updatedPayment = updatedPaymentResults[0];
          if (!updatedPayment) {
            throw new Error('Payment record not found after update');
          }

          // DISPATCH WEBHOOK EVENT: Payment failed
          const userMapping = WebhookEventBuilders.createSSORoundtableUserMapping(
            updatedPayment.userId,
          );

          const paymentEvent = WebhookEventBuilders.createPaymentFailedEvent(
            updatedPayment.id,
            userMapping.virtualStripeCustomerId,
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
          await WebhookEndpointManager.dispatchEvent(paymentEvent, userMapping);

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
    if (c.env?.NEXT_PUBLIC_EXTERNAL_WEBHOOK_URL) {
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

        const fetchResult = await postJSON(c.env.NEXT_PUBLIC_EXTERNAL_WEBHOOK_URL, forwardPayload, fetchConfig, {
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

    return Responses.ok(c, {
      received: true,
      eventId,
      processed,
      forwarded,
      webhook_events_dispatched: processed,
    });
  },
);

/**
 * Get webhook events handler - Refactored
 * Now uses unified createHandler pattern
 */
export const getWebhookEventsHandler: RouteHandler<typeof getWebhookEventsRoute, ApiEnv> = createHandler(
  {
    auth: 'session', // Admin access required
    validateQuery: z.object({
      source: z.string().optional(),
      processed: z.enum(['true', 'false']).optional(),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    }),
    operationName: 'getWebhookEvents',
  },
  async (c) => {
    const { source, processed, limit, offset } = c.validated.query;

    c.logger.info('Fetching webhook events', {
      logType: 'operation',
      operationName: 'getWebhookEvents',
      resource: `events[${limit}]`,
    });

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

    return Responses.ok(c, transformedEvents);
  },
);

/**
 * Test webhook handler - Refactored
 * Now uses unified createHandler pattern
 */
export const testWebhookHandler: RouteHandler<typeof testWebhookRoute, ApiEnv> = createHandler(
  {
    auth: 'session', // Admin access required for testing
    validateBody: z.object({
      url: z.string().url(),
      payload: z.record(z.string(), z.unknown()).optional(),
    }),
    operationName: 'testWebhook',
  },
  async (c) => {
    const { url, payload } = c.validated.body;

    c.logger.info('Testing webhook delivery', {
      logType: 'operation',
      operationName: 'testWebhook',
      resource: url,
    });

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

    return Responses.ok(c, {
      success,
      statusCode: fetchResult.response?.status || 0,
      responseTime,
      error,
    });
  },
);
