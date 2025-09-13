import type { RouteHandler } from '@hono/zod-openapi';

import { createError } from '@/api/common/error-handling';
import { createHandler, Responses } from '@/api/core';
import type { ApiEnv } from '@/api/types';

import type { secureMeRoute } from './route';

/**
 * Handler for secure /auth/me endpoint
 * Returns current authenticated user information
 * Refactored: Now uses unified factory pattern with consistent responses
 */
export const secureMeHandler: RouteHandler<typeof secureMeRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'getMe',
  },
  async (c) => {
    const user = c.get('user');
    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }
    const session = c.get('session');

    c.logger.info('Fetching current user information', {
      logType: 'operation',
      operationName: 'getMe',
      userId: user.id,
    });

    const payload = {
      userId: user.id ?? session?.userId ?? 'unknown',
      email: user.email ?? null,
    } as const;

    c.logger.info('User information retrieved successfully', {
      logType: 'operation',
      operationName: 'getMe',
      resource: user.id,
    });

    return Responses.ok(c, payload);
  },
);
