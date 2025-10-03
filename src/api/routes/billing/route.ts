import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { createApiResponseSchema } from '@/api/core/schemas';

import {
  CancelSubscriptionRequestSchema,
  CheckoutRequestSchema,
  CheckoutResponseSchema,
  ProductDetailResponseSchema,
  ProductIdParamSchema,
  ProductListResponseSchema,
  SubscriptionDetailResponseSchema,
  SubscriptionIdParamSchema,
  SubscriptionListResponseSchema,
  WebhookResponseSchema,
} from './schema';

// ============================================================================
// Product Routes
// ============================================================================

export const listProductsRoute = createRoute({
  method: 'get',
  path: '/products',
  tags: ['billing'],
  summary: 'List all products',
  description: 'Get all active products with their pricing plans',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Products retrieved successfully',
      content: {
        'application/json': { schema: ProductListResponseSchema },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const getProductRoute = createRoute({
  method: 'get',
  path: '/products/:id',
  tags: ['billing'],
  summary: 'Get product details',
  description: 'Get a specific product with all its pricing plans',
  request: {
    params: ProductIdParamSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Product retrieved successfully',
      content: {
        'application/json': { schema: ProductDetailResponseSchema },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Product not found' },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

// ============================================================================
// Checkout Routes
// ============================================================================

export const createCheckoutSessionRoute = createRoute({
  method: 'post',
  path: '/checkout',
  tags: ['billing'],
  summary: 'Create checkout session',
  description: 'Create a Stripe checkout session for subscription purchase',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CheckoutRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Checkout session created successfully',
      content: {
        'application/json': { schema: CheckoutResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Invalid request data' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

// ============================================================================
// Subscription Routes
// ============================================================================

export const listSubscriptionsRoute = createRoute({
  method: 'get',
  path: '/subscriptions',
  tags: ['billing'],
  summary: 'List user subscriptions',
  description: 'Get all subscriptions for the authenticated user',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Subscriptions retrieved successfully',
      content: {
        'application/json': { schema: SubscriptionListResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const getSubscriptionRoute = createRoute({
  method: 'get',
  path: '/subscriptions/:id',
  tags: ['billing'],
  summary: 'Get subscription details',
  description: 'Get details of a specific subscription',
  request: {
    params: SubscriptionIdParamSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Subscription retrieved successfully',
      content: {
        'application/json': { schema: SubscriptionDetailResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Subscription not found' },
    [HttpStatusCodes.FORBIDDEN]: { description: 'Subscription does not belong to user' },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const cancelSubscriptionRoute = createRoute({
  method: 'post',
  path: '/subscriptions/:id/cancel',
  tags: ['billing'],
  summary: 'Cancel subscription',
  description: 'Cancel a subscription (either immediately or at period end)',
  request: {
    params: SubscriptionIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: CancelSubscriptionRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Subscription canceled successfully',
      content: {
        'application/json': { schema: SubscriptionDetailResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Subscription not found' },
    [HttpStatusCodes.FORBIDDEN]: { description: 'Subscription does not belong to user' },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

// ============================================================================
// Sync Routes
// ============================================================================

export const syncAfterCheckoutRoute = createRoute({
  method: 'post',
  path: '/sync-after-checkout',
  tags: ['billing'],
  summary: 'Sync Stripe data after checkout',
  description: 'Eagerly sync Stripe subscription data after successful checkout to prevent race conditions with webhooks',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Stripe data synced successfully',
      content: {
        'application/json': {
          schema: createApiResponseSchema(
            z.object({
              synced: z.boolean().openapi({
                description: 'Whether sync was successful',
                example: true,
              }),
              subscription: z.object({
                status: z.string().openapi({
                  description: 'Subscription status',
                  example: 'active',
                }),
                subscriptionId: z.string().openapi({
                  description: 'Stripe subscription ID',
                  example: 'sub_ABC123',
                }),
              }).nullable().openapi({
                description: 'Synced subscription state',
              }).openapi('SyncedSubscriptionState'),
            }).openapi('SyncAfterCheckoutPayload'),
          ),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'No Stripe customer found for user' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

// ============================================================================
// Webhook Routes
// ============================================================================

export const handleWebhookRoute = createRoute({
  method: 'post',
  path: '/webhooks/stripe',
  tags: ['billing'],
  summary: 'Handle Stripe webhooks',
  description: `Process Stripe webhook events using Theo's "Stay Sane with Stripe" pattern.

    This endpoint receives webhook events from Stripe and processes them by:
    1. Verifying the webhook signature for security
    2. Checking for duplicate events (idempotency)
    3. Extracting customer ID from the event payload
    4. Syncing fresh data from Stripe API (never trusting webhook payload)
    5. Updating database with the latest subscription and invoice states

    Tracked events: checkout.session.completed, customer.subscription.*, invoice.*, payment_intent.*`,
  request: {
    headers: z.object({
      'stripe-signature': z.string().min(1).openapi({
        param: {
          name: 'stripe-signature',
          in: 'header',
        },
        example: 't=1234567890,v1=abcdef...',
        description: 'Stripe webhook signature for verification',
      }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Webhook received and processed successfully',
      content: {
        'application/json': { schema: WebhookResponseSchema },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Invalid webhook signature or payload' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Webhook processing failed' },
  },
});
