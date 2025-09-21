import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { createApiResponseSchema } from '@/api/core/schemas';

import {
  CancelSubscriptionRequestSchema,
  CancelSubscriptionResponseDataSchema,
  ChangePlanRequestSchema,
  ChangePlanResponseDataSchema,
  CreateSubscriptionRequestSchema,
  CreateSubscriptionResponseDataSchema,
  GetSubscriptionResponseDataSchema,
  GetSubscriptionsResponseDataSchema,
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
        'application/json': { schema: createApiResponseSchema(GetSubscriptionsResponseDataSchema) },
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
        'application/json': { schema: createApiResponseSchema(GetSubscriptionResponseDataSchema) },
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
        'application/json': { schema: createApiResponseSchema(CreateSubscriptionResponseDataSchema) },
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
        'application/json': { schema: createApiResponseSchema(CancelSubscriptionResponseDataSchema) },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Not Found' },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: { description: 'Validation Error' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const changePlanRoute = createRoute({
  method: 'patch',
  path: '/subscriptions/{id}',
  tags: ['subscriptions'],
  summary: 'Change subscription plan',
  description: 'Change the subscription to a different product plan with proration calculation',
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
      description: 'Subscription plan changed successfully',
      content: {
        'application/json': { schema: createApiResponseSchema(ChangePlanResponseDataSchema) },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Not Found' },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: { description: 'Validation Error' },
    [HttpStatusCodes.CONFLICT]: { description: 'Conflict - Cannot change to same plan or invalid state' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});
