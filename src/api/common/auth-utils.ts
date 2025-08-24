import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { UserSession } from '@/types/api-types';

// Authentication utilities with proper typing - replaces 'any' usage
export function requireAuth(c: Context): UserSession {
  const session = c.get('session') as UserSession | undefined;
  if (!session?.activeOrganizationId) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Unauthorized',
    });
  }
  return session;
}

// Type-safe validation for organization access
export function validateOrganizationAccess(session: UserSession, organizationId: string): void {
  if (session.activeOrganizationId !== organizationId) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: 'Access denied to this organization',
    });
  }
}

// Helper to check if user has required permissions (extensible)
export function hasPermission(session: UserSession, _permission: string): boolean {
  // Placeholder for future permission system
  // For now, just check if user has active organization
  return Boolean(session.activeOrganizationId);
}
