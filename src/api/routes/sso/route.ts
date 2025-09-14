import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { createApiResponseSchema } from '@/api/core/schemas';

import {
  ExchangeTokenSchema,
  SSOExchangeResponseSchema,
} from './schema';

// Route for exchanging signed tokens for authenticated sessions
export const ssoExchangeRoute = createRoute({
  method: 'get',
  path: '/sso/exchange',
  request: {
    query: ExchangeTokenSchema,
  },
  responses: {
    [HttpStatusCodes.MOVED_TEMPORARILY]: {
      description: 'Redirect to subscription plans page with authenticated session',
      headers: z.object({
        'Location': z.string().openapi({
          example: '/dashboard/plans?source=roundtable&priceId=price_intensive_monthly',
        }),
        'Set-Cookie': z.string().openapi({
          example: 'better-auth.session_token=abc123; HttpOnly; Secure; SameSite=Lax',
        }),
      }),
    },
    [HttpStatusCodes.OK]: {
      description: 'SSO exchange successful (for API usage)',
      content: {
        'application/json': {
          schema: createApiResponseSchema(SSOExchangeResponseSchema),
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Invalid or malformed exchange token',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      description: 'Invalid, expired, or untrusted exchange token',
    },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: {
      description: 'Internal server error during SSO exchange',
    },
  },
  tags: ['SSO'],
  summary: 'Exchange signed token for authenticated session',
  description: 'Validates signed exchange token from roundtable project and creates BetterAuth session',
});
