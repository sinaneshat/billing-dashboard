import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { createApiResponseSchema } from '@/api/core/schemas';

import { SSOBodySchema, SSOErrorSchema, SSOTokenSchema } from './schema';

/**
 * SSO Route for GET requests (Legacy - Deprecated)
 * @deprecated Use POST method for secure JWT transmission
 */
export const ssoGetRoute = createRoute({
  method: 'get',
  path: '/auth/sso',
  tags: ['auth'],
  summary: 'Single Sign-On from Roundtable (Legacy)',
  description: 'DEPRECATED: Legacy SSO authentication using JWT in URL parameters. Use POST method for secure JWT transmission.',
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

/**
 * SSO Route for POST requests (Secure)
 */
export const ssoPostRoute = createRoute({
  method: 'post',
  path: '/auth/sso',
  tags: ['auth'],
  summary: 'Single Sign-On from Roundtable (Secure)',
  description: 'Secure SSO authentication using JWT in request body to prevent token exposure in logs.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: SSOBodySchema,
        },
        'application/x-www-form-urlencoded': {
          schema: SSOBodySchema,
        },
      },
    },
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

// Maintain backward compatibility by exporting the legacy route as default
export const ssoRoute = ssoGetRoute;
