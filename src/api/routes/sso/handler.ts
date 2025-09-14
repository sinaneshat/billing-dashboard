/**
 * SSO Route Handlers - Refactored
 *
 * Follows the established factory pattern for consistent authentication,
 * validation, error handling, and response formatting.
 *
 * Implements secure server-side token exchange for cross-application SSO.
 */

import type { RouteHandler } from '@hono/zod-openapi';

import { createError } from '@/api/common/error-handling';
import { createHandler, Responses } from '@/api/core';
import { SSOExchangeService } from '@/api/services/sso-exchange';
import type { ApiEnv } from '@/api/types';
import { auth } from '@/lib/auth';

import type { ssoExchangeRoute } from './route';

// ============================================================================
// SSO HANDLERS
// ============================================================================

/**
 * GET /sso/exchange - Exchange signed token for authenticated session
 * Refactored: Uses factory pattern with secure token validation
 */
export const ssoExchangeHandler: RouteHandler<typeof ssoExchangeRoute, ApiEnv> = createHandler(
  {
    auth: 'public', // Public endpoint - creates its own authentication
    operationName: 'SSOExchange',
  },
  async (c) => {
    const token = c.req.query('token');
    if (!token) {
      throw createError.validation('Missing exchange token parameter');
    }

    // Extract optional pricing parameters
    const priceId = c.req.query('price');
    const productId = c.req.query('product');

    c.logger.info('Processing SSO token exchange', {
      logType: 'operation',
      operationName: 'SSOExchange',
      resource: `priceId:${priceId || 'none'}, productId:${productId || 'none'}`,
    });

    try {
      // Initialize SSO exchange service
      const ssoService = new SSOExchangeService(c.env as unknown as ApiEnv);

      // Verify and extract token payload
      const payload = await ssoService.verifyExchangeToken(token);

      c.logger.info('Token verified successfully', {
        logType: 'operation',
        operationName: 'SSOExchange',
        resource: payload.email,
      });

      // Extract user data for session creation
      const userData = ssoService.extractUserData(payload);

      // Find or create user using Better Auth
      let userId: string;
      try {
        // First try to find existing user
        const existingUser = await auth.api.listUsers({
          query: {
            searchField: 'email',
            searchValue: userData.email,
            searchOperator: 'contains',
            limit: 1,
          },
        });

        if (existingUser.users && existingUser.users.length > 0) {
          userId = existingUser.users[0]?.id || '';
          if (!userId) {
            throw new Error('Found user but no ID available');
          }
          c.logger.info('Found existing user for SSO exchange', {
            logType: 'operation',
            operationName: 'SSOExchange',
            resource: userData.email,
          });
        } else {
          // Create new user via admin API
          const newUser = await auth.api.createUser({
            body: {
              email: userData.email,
              name: userData.name,
              password: crypto.randomUUID(), // Random password since they'll only use SSO
              data: {
                emailVerified: userData.emailVerified,
                ssoProvider: 'roundtable',
                createdViaSSO: true,
              },
            },
          });

          userId = newUser.user?.id || '';
          if (!userId) {
            throw new Error('Created user but no ID returned');
          }

          c.logger.info('Created new user via SSO exchange', {
            logType: 'operation',
            operationName: 'SSOExchange',
            resource: userData.email,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        c.logger.error(`Failed to find/create user for SSO exchange: ${errorMessage}`);
        throw createError.database('Failed to provision user account');
      }

      // Create authenticated session using Better Auth
      try {
        const session = await auth.api.impersonateUser({
          body: {
            userId,
          },
        });

        // Set session cookies in response
        if (session.session && session.session.token) {
          // Better Auth session cookie configuration
          const sessionCookieName = 'better-auth.session_token';
          const sessionCookieValue = session.session.token;
          const expiresAt = new Date(session.session.expiresAt);

          c.header('Set-Cookie', `${sessionCookieName}=${sessionCookieValue}; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=${expiresAt.toUTCString()}`);

          c.logger.info('SSO session created successfully', {
            logType: 'operation',
            operationName: 'SSOExchange',
            resource: userData.email,
          });
        } else {
          throw new Error('Session creation failed - no session token returned');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        c.logger.error(`Failed to create session for SSO user: ${errorMessage}`);
        throw createError.database('Failed to create authenticated session');
      }

      c.logger.info('User provisioning completed via SSO exchange', {
        logType: 'operation',
        operationName: 'SSOExchange',
        resource: userData.email,
      });

      // Generate redirect URL with pricing parameters
      const redirectUrl = ssoService.generateRedirectUrl({
        priceId,
        productId,
      });

      c.logger.info('SSO exchange completed successfully', {
        logType: 'operation',
        operationName: 'SSOExchange',
        resource: userData.email,
      });

      // Check if this is an API request or browser redirect
      const acceptHeader = c.req.header('accept');
      if (acceptHeader?.includes('application/json')) {
        // API request - return JSON response
        return Responses.ok(c, {
          redirectUrl,
          sessionCreated: true,
        });
      } else {
        // Browser request - redirect to plans page
        return c.redirect(redirectUrl);
      }
    } catch (error) {
      c.logger.error('SSO token exchange failed');

      if (error instanceof Error && error.message.includes('expired')) {
        throw createError.unauthenticated('Exchange token has expired');
      }

      if (error instanceof Error && error.message.includes('Invalid')) {
        throw createError.unauthenticated('Invalid exchange token');
      }

      throw createError.unauthenticated('SSO exchange failed');
    }
  },
);
