import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { CommonErrorResponses } from '@/api/common';

import { DetailedHealthResponseSchema, HealthResponseSchema } from './schema';

export const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['system'],
  summary: 'Basic health check',
  description: 'Basic health check endpoint for monitoring',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Basic health check',
      content: {
        'application/json': { schema: HealthResponseSchema },
      },
    },
    ...CommonErrorResponses.public,
  },
});

export const detailedHealthRoute = createRoute({
  method: 'get',
  path: '/health/detailed',
  tags: ['system'],
  summary: 'Detailed health check',
  description: 'Detailed health check with environment and dependencies',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Detailed health check with environment and dependencies',
      content: {
        'application/json': { schema: DetailedHealthResponseSchema },
      },
    },
    [HttpStatusCodes.SERVICE_UNAVAILABLE]: {
      description: 'Service unavailable - health check failed',
      content: {
        'application/json': { schema: DetailedHealthResponseSchema },
      },
    },
    ...CommonErrorResponses.public,
  },
});
