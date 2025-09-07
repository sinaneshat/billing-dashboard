import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { CreatePaymentMethodRequestSchema, CreatePaymentMethodResponseSchema, DeletePaymentMethodResponseSchema, GetPaymentMethodsResponseSchema, PaymentMethodParamsSchema, SetDefaultPaymentMethodResponseSchema } from './schema';

export const getPaymentMethodsRoute = createRoute({
  method: 'get',
  path: '/payment-methods',
  tags: ['payment-methods'],
  summary: 'Get subscription billing methods',
  description: 'Get all saved billing methods for subscription automation',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Payment methods retrieved successfully',
      content: {
        'application/json': { schema: GetPaymentMethodsResponseSchema },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Not Found' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const createPaymentMethodRoute = createRoute({
  method: 'post',
  path: '/payment-methods',
  tags: ['payment-methods'],
  summary: 'Add subscription billing method',
  description: 'Add a new billing method for subscription automation',
  request: {
    body: {
      content: {
        'application/json': { schema: CreatePaymentMethodRequestSchema },
      },
      description: 'Payment method data',
    },
  },
  responses: {
    [HttpStatusCodes.CREATED]: {
      description: 'Payment method created successfully',
      content: {
        'application/json': { schema: CreatePaymentMethodResponseSchema },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: { description: 'Validation Error' },
    [HttpStatusCodes.CONFLICT]: { description: 'Conflict' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const deletePaymentMethodRoute = createRoute({
  method: 'delete',
  path: '/payment-methods/{id}',
  tags: ['payment-methods'],
  summary: 'Remove subscription billing method',
  description: 'Remove a billing method from subscription automation',
  request: {
    params: PaymentMethodParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Payment method deleted successfully',
      content: {
        'application/json': { schema: DeletePaymentMethodResponseSchema },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: { description: 'Validation Error' },
    [HttpStatusCodes.CONFLICT]: { description: 'Conflict' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const setDefaultPaymentMethodRoute = createRoute({
  method: 'patch',
  path: '/payment-methods/{id}/default',
  tags: ['payment-methods'],
  summary: 'Set primary subscription billing method',
  description: 'Set a billing method as the primary method for subscription automation',
  request: {
    params: PaymentMethodParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Default payment method updated successfully',
      content: {
        'application/json': { schema: SetDefaultPaymentMethodResponseSchema },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: { description: 'Validation Error' },
    [HttpStatusCodes.CONFLICT]: { description: 'Conflict' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});
