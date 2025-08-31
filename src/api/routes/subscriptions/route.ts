import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { CommonErrorResponses } from '@/api/common';

import {
  CancelSubscriptionRequestSchema,
  CancelSubscriptionResponseSchema,
  CreateSubscriptionRequestSchema,
  CreateSubscriptionResponseSchema,
  GetSubscriptionResponseSchema,
  GetSubscriptionsResponseSchema,
  ResubscribeResponseSchema,
  SubscriptionParamsSchema,
} from './schema';

export const getSubscriptionsRoute = createRoute({
  method: 'get',
  path: '/subscriptions',
  tags: ['subscriptions'],
  summary: 'Get user subscriptions',
  description: 'Get all subscriptions for the authenticated user',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'User subscriptions retrieved successfully',
      content: {
        'application/json': { schema: GetSubscriptionsResponseSchema },
      },
    },
    ...CommonErrorResponses.read,
  },
});

export const getSubscriptionRoute = createRoute({
  method: 'get',
  path: '/subscriptions/{id}',
  tags: ['subscriptions'],
  summary: 'Get subscription by ID',
  description: 'Get a specific subscription by its ID',
  request: {
    params: SubscriptionParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Subscription retrieved successfully',
      content: {
        'application/json': { schema: GetSubscriptionResponseSchema },
      },
    },
    ...CommonErrorResponses.read,
  },
});

export const createSubscriptionRoute = createRoute({
  method: 'post',
  path: '/subscriptions',
  tags: ['subscriptions'],
  summary: 'Create new subscription',
  description: 'Create a new subscription and initiate payment flow',
  request: {
    body: {
      content: {
        'application/json': { schema: CreateSubscriptionRequestSchema },
      },
    },
  },
  responses: {
    [HttpStatusCodes.CREATED]: {
      description: 'Subscription created and payment initiated',
      content: {
        'application/json': { schema: CreateSubscriptionResponseSchema },
      },
    },
    ...CommonErrorResponses.create,
  },
});

export const cancelSubscriptionRoute = createRoute({
  method: 'patch',
  path: '/subscriptions/{id}/cancel',
  tags: ['subscriptions'],
  summary: 'Cancel subscription',
  description: 'Cancel an active subscription',
  request: {
    params: SubscriptionParamsSchema,
    body: {
      content: {
        'application/json': { schema: CancelSubscriptionRequestSchema },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Subscription canceled successfully',
      content: {
        'application/json': { schema: CancelSubscriptionResponseSchema },
      },
    },
    ...CommonErrorResponses.update,
  },
});

export const resubscribeRoute = createRoute({
  method: 'post',
  path: '/subscriptions/{id}/resubscribe',
  tags: ['subscriptions'],
  summary: 'Resubscribe to canceled subscription',
  description: 'Reactivate a canceled subscription by initiating new payment',
  request: {
    params: SubscriptionParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: CreateSubscriptionRequestSchema.pick({ callbackUrl: true }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Resubscription initiated successfully',
      content: {
        'application/json': { schema: ResubscribeResponseSchema },
      },
    },
    ...CommonErrorResponses.update,
  },
});
