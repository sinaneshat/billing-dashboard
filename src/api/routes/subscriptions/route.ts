import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

// import { Responses } from '@/api/core'; // Commented out as unused
import {
  CancelSubscriptionRequestSchema,
  CancelSubscriptionResponseSchema,
  ChangePlanRequestSchema,
  ChangePlanResponseSchema,
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
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Not Found' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
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
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Not Found' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
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
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: { description: 'Validation Error' },
    [HttpStatusCodes.CONFLICT]: { description: 'Conflict' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
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
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Not Found' },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: { description: 'Validation Error' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
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
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Not Found' },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: { description: 'Validation Error' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const changePlanRoute = createRoute({
  method: 'post',
  path: '/subscriptions/{id}/change-plan',
  tags: ['subscriptions'],
  summary: 'Change subscription plan',
  description: 'Change a subscription to a different plan (upgrade or downgrade)',
  request: {
    params: SubscriptionParamsSchema,
    body: {
      content: {
        'application/json': { schema: ChangePlanRequestSchema },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Plan changed successfully',
      content: {
        'application/json': { schema: ChangePlanResponseSchema },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Not Found' },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: { description: 'Validation Error' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});
