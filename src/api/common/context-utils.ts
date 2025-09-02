/**
 * Type-safe context and session handling utilities
 * Eliminates unsafe context casting patterns
 */

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { ApiEnv } from '@/api/types';
import type { Session, User } from '@/lib/auth/types';

/**
 * Type guard to validate session structure
 */
export function isValidSession(session: unknown): session is Session {
  return (
    session !== null
    && typeof session === 'object'
    && session !== undefined
    && 'userId' in session
    && 'expiresAt' in session
    && typeof (session as Record<string, unknown>).userId === 'string'
    && (session as Record<string, unknown>).expiresAt instanceof Date
  );
}

/**
 * Type guard to validate user structure
 */
export function isValidUser(user: unknown): user is User {
  return (
    user !== null
    && typeof user === 'object'
    && user !== undefined
    && 'id' in user
    && typeof (user as Record<string, unknown>).id === 'string'
  );
}

/**
 * Safely get session from context without casting
 * Returns null if session is invalid or missing
 */
export function getSession(c: Context<ApiEnv>): Session | null {
  const session = c.get('session');
  return isValidSession(session) ? session : null;
}

/**
 * Get session from context, throw if missing or invalid
 */
export function requireSession(c: Context<ApiEnv>): Session {
  const session = getSession(c);

  if (!session) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  return session;
}

/**
 * Safely get user from context
 */
export function getUser(c: Context<ApiEnv>): User | null {
  const user = c.get('user');
  return isValidUser(user) ? user : null;
}

/**
 * Get user from context, throw if missing or invalid
 */
export function requireUser(c: Context<ApiEnv>): User {
  const user = getUser(c);

  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'User authentication required',
    });
  }

  return user;
}

/**
 * Check if session is expired
 */
export function isSessionExpired(session: Session): boolean {
  return session.expiresAt <= new Date();
}

/**
 * Get authenticated user ID safely
 */
export function getUserId(c: Context<ApiEnv>): string {
  const user = requireUser(c);
  return user.id;
}

/**
 * Check if user has valid, non-expired session
 */
export function hasValidSession(c: Context<ApiEnv>): boolean {
  const session = getSession(c);
  return session !== null && !isSessionExpired(session);
}
