import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { createApiResponseSchema } from '@/api/core/schemas';

import { SSOErrorSchema, SSOTokenSchema } from './schema';

export const ssoRoute = createRoute({
  method: 'get',
  path: '/auth/sso',
  tags: ['auth'],
  summary: 'Single Sign-On from Roundtable',
  description: 'Authenticates users from Roundtable1 project using JWT tokens and creates/signs in users',
  request: {
    query: SSOTokenSchema,
  },
  responses: {
    [HttpStatusCodes.TEMPORARY_REDIRECT]: {
      description: 'Successfully authenticated, redirecting to dashboard',
      headers: {
        Location: {
          description: 'Redirect URL to dashboard',
          schema: {
            type: 'string',
          },
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Invalid token or missing required parameters',
      content: {
        'application/json': {
          schema: createApiResponseSchema(SSOErrorSchema),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      description: 'Invalid or expired token',
      content: {
        'application/json': {
          schema: createApiResponseSchema(SSOErrorSchema),
        },
      },
    },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: {
      description: 'Server configuration error or unexpected failure',
      content: {
        'application/json': {
          schema: createApiResponseSchema(SSOErrorSchema),
        },
      },
    },
  },
});
