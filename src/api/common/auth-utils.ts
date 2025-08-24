import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { Session } from '@/lib/auth/types';

// Authentication utilities with proper typing - replaces 'any' usage
export function requireAuth(c: Context): Session {
  const session = c.get('session') as Session | null;
  if (!session?.userId) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Unauthorized',
    });
  }
  return session;
}

// Helper to check if user has valid session
export function hasValidSession(session: Session | null | undefined): boolean {
  return Boolean(session?.userId && session?.expiresAt && session.expiresAt > new Date());
}
