import type { RouteHandler } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { ok } from '@/api/common/responses';
import type { ApiEnv } from '@/api/types';

import type { secureMeRoute } from './route';

/**
 * Handler for secure /auth/me endpoint
 * Returns current authenticated user information
 * @param c - Hono context
 * @returns User information
 */
export const secureMeHandler: RouteHandler<typeof secureMeRoute, ApiEnv> = (c) => {
  c.header('X-Route', 'auth/me');
  const session = c.get('session');
  const user = c.get('user');
  const payload = {
    userId: user?.id ?? session?.userId ?? 'unknown',
    email: user?.email ?? null,
    activeOrganizationId: session?.activeOrganizationId ?? null,
  } as const;
  return ok(c, payload, undefined, HttpStatusCodes.OK);
};
