import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { CommonErrorResponses } from '@/api/common';

import {
  GetPaymentsResponseSchema,
  PaymentCallbackRequestSchema,
  PaymentCallbackResponseSchema,
  VerifyPaymentRequestSchema,
  VerifyPaymentResponseSchema,
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
    ...CommonErrorResponses.read,
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
    ...CommonErrorResponses.crud,
  },
});

export const verifyPaymentRoute = createRoute({
  method: 'post',
  path: '/payments/verify',
  tags: ['payments'],
  summary: 'Verify payment with ZarinPal',
  description: 'Manually verify a payment with ZarinPal (for debugging/recovery)',
  request: {
    body: {
      content: {
        'application/json': { schema: VerifyPaymentRequestSchema },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Payment verified successfully',
      content: {
        'application/json': { schema: VerifyPaymentResponseSchema },
      },
    },
    ...CommonErrorResponses.update,
  },
});
