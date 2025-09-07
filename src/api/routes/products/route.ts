import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { GetProductsResponseSchema } from './schema';

export const getProductsRoute = createRoute({
  method: 'get',
  path: '/products',
  tags: ['products'],
  summary: 'Get all products',
  description: 'Get all available products for purchase',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Products retrieved successfully',
      content: {
        'application/json': { schema: GetProductsResponseSchema },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});
