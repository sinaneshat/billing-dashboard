import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { GetContractStatusResponseSchema } from './schema';

export const getContractStatusRoute = createRoute({
  method: 'get',
  path: '/payment-methods/contract-status',
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: GetContractStatusResponseSchema,
        },
      },
      description: 'Direct debit contract status retrieved successfully',
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Not Found' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
  tags: ['Payment Methods'],
  summary: 'Get direct debit contract status',
  description: 'Analyzes user payment methods to determine direct debit contract status and capabilities',
});
