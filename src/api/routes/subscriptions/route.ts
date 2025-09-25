import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { createApiResponseSchema } from '@/api/core/schemas';

import {
  CancelSubscriptionRequestSchema,
  CancelSubscriptionResponseDataSchema,
  CreateSubscriptionRequestSchema,
  CreateSubscriptionResponseDataSchema,
  GetSubscriptionResponseDataSchema,
  GetSubscriptionsResponseDataSchema,
  SubscriptionParamsSchema,
  SwitchSubscriptionRequestSchema,
  SwitchSubscriptionResponseDataSchema,
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

export const switchSubscriptionRoute = createRoute({
  method: 'patch',
  path: '/subscriptions/switch',
  tags: ['subscriptions'],
  summary: 'Switch to a different subscription plan',
  description: 'Cancel current subscription and create a new one with prorated billing. This is the secure way to change subscriptions when single active subscription constraint is enforced.',
  request: {
    body: {
      content: {
        'application/json': { schema: SwitchSubscriptionRequestSchema },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Subscription switched successfully',
      content: {
        'application/json': { schema: createApiResponseSchema(SwitchSubscriptionResponseDataSchema) },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request - Invalid request data' },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Unauthorized - Authentication required' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Not Found - No active subscription or target product not found' },
    [HttpStatusCodes.CONFLICT]: { description: 'Conflict - Cannot switch to same product or invalid state' },
    [HttpStatusCodes.PAYMENT_REQUIRED]: { description: 'Payment Failed - Could not process payment for upgrade' },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: { description: 'Validation Error' },
    [HttpStatusCodes.TOO_MANY_REQUESTS]: { description: 'Rate Limited - Too many subscription operations' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});
