import { z } from '@hono/zod-openapi';

import { createApiResponseSchema } from '@/api/core/schemas';
import { webhookEventSelectSchema } from '@/db/validation/billing';

// ZarinPal webhook payload schema
export const ZarinPalWebhookRequestSchema = z.object({
  // Standard ZarinPal webhook fields
  authority: z.string().openapi({
    example: 'A00000000000000000000000000123456789',
    description: 'ZarinPal payment authority',
  }),
  status: z.enum(['OK', 'NOK']).openapi({
    example: 'OK',
    description: 'Payment status',
  }),
  ref_id: z.string().optional().openapi({
    example: '123456789',
    description: 'ZarinPal reference ID',
  }),
  card_hash: z.string().optional().openapi({
    example: 'abcd1234efgh5678',
    description: 'Card hash for direct debit',
  }),
  card_pan: z.string().optional().openapi({
    example: '1234****5678',
    description: 'Masked card number',
  }),
  fee: z.number().optional().openapi({
    example: 2500,
    description: 'Transaction fee',
  }),
  fee_type: z.string().optional().openapi({
    example: 'Merchant',
    description: 'Fee type',
  }),
}).openapi('ZarinPalWebhookRequest');

// Single source of truth - use drizzle-zod schema, omit sensitive fields for public API
const WebhookEventSchema = webhookEventSelectSchema.omit({
  rawPayload: true, // Contains sensitive webhook data
  processingError: true, // Internal error details
  forwardingError: true, // Internal error details
  updatedAt: true, // Not needed for public API
}).openapi({
  example: {
    id: 'webhook_123',
    source: 'zarinpal',
    eventType: 'payment.completed',
    paymentId: 'pay_123',
    processed: true,
    processedAt: new Date().toISOString(),
    forwardedToExternal: true,
    forwardedAt: new Date().toISOString(),
    externalWebhookUrl: 'https://api.example.com/webhooks',
    createdAt: new Date().toISOString(),
  },
});

// Response schemas
export const WebhookReceiveResponseSchema = createApiResponseSchema(
  z.object({
    received: z.boolean(),
    eventId: z.string(),
    processed: z.boolean(),
    forwarded: z.boolean(),
  }),
).openapi('WebhookReceiveResponse');

export const GetWebhookEventsResponseSchema = createApiResponseSchema(
  z.array(WebhookEventSchema),
).openapi('GetWebhookEventsResponse');

// Query parameters for webhook events
export const WebhookEventsQuerySchema = z.object({
  source: z.string().optional().openapi({
    example: 'zarinpal',
    description: 'Filter by webhook source',
  }),
  processed: z.enum(['true', 'false']).optional().openapi({
    example: 'true',
    description: 'Filter by processing status',
  }),
  limit: z.coerce.number().min(1).max(100).default(50).openapi({
    example: 20,
    description: 'Number of events to return (max 100)',
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    example: 0,
    description: 'Number of events to skip',
  }),
}).openapi('WebhookEventsQuery');

// Test webhook request
export const TestWebhookRequestSchema = z.object({
  url: z.string().url().openapi({
    example: 'https://api.example.com/webhooks',
    description: 'URL to test webhook delivery',
  }),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().openapi({
    example: { test: true, timestamp: '2024-01-01T00:00:00Z' },
    description: 'Optional test payload',
  }),
}).openapi('TestWebhookRequest');

export const TestWebhookResponseSchema = createApiResponseSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    responseTime: z.number(),
    error: z.string().optional(),
  }),
).openapi('TestWebhookResponse');

// Export types
export type ZarinPalWebhookRequest = z.infer<typeof ZarinPalWebhookRequestSchema>;
export type WebhookEventsQuery = z.infer<typeof WebhookEventsQuerySchema>;
export type TestWebhookRequest = z.infer<typeof TestWebhookRequestSchema>;
