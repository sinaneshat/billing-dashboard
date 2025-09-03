import type { RouteHandler } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { ApiEnv } from '@/api/types';

import type { secureMeRoute } from './route';

/**
 * Handler for secure /auth/me endpoint
 * Returns current authenticated user information
 * Following proper Hono OpenAPI pattern with direct response handling
 */
export const secureMeHandler: RouteHandler<typeof secureMeRoute, ApiEnv> = (c) => {
  const session = c.get('session');
  const user = c.get('user');
  const payload = {
    userId: user?.id ?? session?.userId ?? 'unknown',
    email: user?.email ?? null,
  } as const;

  return c.json({
    success: true,
    data: payload,
  }, HttpStatusCodes.OK);
};
