import type { RouteHandler } from '@hono/zod-openapi';

import { createError } from '@/api/common/error-handling';
import { createHandler, Responses } from '@/api/core';
import type { ApiEnv } from '@/api/types';

import type { secureMeRoute } from './route';

/**
 * Handler for secure /auth/me endpoint
 * Returns current authenticated user information
 * Following Better Auth patterns for user data retrieval
 */
export const secureMeHandler: RouteHandler<typeof secureMeRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'getMe',
  },
  async (c) => {
    // Get user from Better Auth session context set by middleware
    const user = c.get('user');
    const session = c.get('session');

    if (!user || !session) {
      throw createError.unauthenticated('Valid session required for user information');
    }

    c.logger.info('Retrieving current user information from Better Auth session', {
      logType: 'operation',
      operationName: 'getMe',
      userId: user.id,
      resource: session.id,
    });

    // Return user data according to Better Auth user schema
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    } as const;

    c.logger.info('User information retrieved successfully from Better Auth', {
      logType: 'operation',
      operationName: 'getMe',
      resource: user.id,
    });

    return Responses.ok(c, payload);
  },
);
