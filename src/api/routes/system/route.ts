import { createRoute } from '@hono/zod-openapi';

import { DetailedHealthResponseSchema, HealthResponseSchema } from './schema';

export const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['system'],
  responses: {
    200: {
      description: 'Basic health check',
      content: {
        'application/json': { schema: HealthResponseSchema },
      },
    },
  },
});
export const detailedHealthRoute = createRoute({
  method: 'get',
  path: '/health/detailed',
  tags: ['system'],
  responses: {
    200: {
      description: 'Detailed health check with environment and dependencies',
      content: {
        'application/json': { schema: DetailedHealthResponseSchema },
      },
    },
  },
});
