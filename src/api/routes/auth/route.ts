import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { SecureMeResponseSchema } from './schema';

export const secureMeRoute = createRoute({
  method: 'get',
  path: '/auth/me',
  tags: ['auth'],
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Return current authenticated user info',
      content: {
        'application/json': { schema: SecureMeResponseSchema },
      },
    },
  },
});
