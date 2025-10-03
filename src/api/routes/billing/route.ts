import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import {
  CancelSubscriptionRequestSchema,
  CheckoutRequestSchema,
  CheckoutResponseSchema,
  ProductDetailResponseSchema,
  ProductListResponseSchema,
  SubscriptionDetailResponseSchema,
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
    params: z.object({
      id: z.string().min(1).openapi({
        param: {
          name: 'id',
          in: 'path',
        },
        example: 'prod_ABC123',
        description: 'Stripe product ID',
      }),
    }),
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
    params: z.object({
      id: z.string().min(1).openapi({
        param: {
          name: 'id',
          in: 'path',
        },
        example: 'sub_ABC123',
        description: 'Stripe subscription ID',
      }),
    }),
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
    params: z.object({
      id: z.string().min(1).openapi({
        param: {
          name: 'id',
          in: 'path',
        },
        example: 'sub_ABC123',
        description: 'Stripe subscription ID',
      }),
    }),
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
// Webhook Routes
// ============================================================================

export const handleWebhookRoute = createRoute({
  method: 'post',
  path: '/webhooks/stripe',
  tags: ['billing'],
  summary: 'Handle Stripe webhooks',
  description: 'Receive and process Stripe webhook events',
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
