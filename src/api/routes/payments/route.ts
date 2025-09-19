import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import {
  GetPaymentsResponseSchema,
  PaymentCallbackRequestSchema,
  PaymentCallbackResponseSchema,
} from './schema';

export const getPaymentsRoute = createRoute({
  method: 'get',
  path: '/payments',
  tags: ['payments'],
  summary: 'Get user payment history',
  description: 'Get all payments for the authenticated user',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Payment history retrieved successfully',
      content: {
        'application/json': { schema: GetPaymentsResponseSchema },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Not Found' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const paymentCallbackRoute = createRoute({
  method: 'get',
  path: '/payments/callback',
  tags: ['payments'],
  summary: 'Handle ZarinPal payment callback',
  description: 'Process payment callback from ZarinPal gateway',
  request: {
    query: PaymentCallbackRequestSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Payment callback processed successfully',
      content: {
        'application/json': { schema: PaymentCallbackResponseSchema },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: { description: 'Validation Error' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});
