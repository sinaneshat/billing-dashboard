import { createRoute } from '@hono/zod-openapi';

import { SecureMeResponseSchema } from './schema';

export const secureMeRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['auth'],
  responses: {
    200: {
      description: 'Return current authenticated user info',
      content: {
        'application/json': { schema: SecureMeResponseSchema },
      },
    },
  },
});
