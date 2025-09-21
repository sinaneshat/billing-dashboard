import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import {
  GetPaymentsResponseSchema,
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
