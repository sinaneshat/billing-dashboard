import * as HttpStatusCodes from 'stoker/http-status-codes';

import { ok } from '@/api/common/responses';
import { createOpenApiApp } from '@/api/factory';
import { requireSession } from '@/api/middleware';

import { secureMeRoute } from './route';

// Create auth app with authentication-related routes
const authApp = createOpenApiApp();
authApp.use('/*', requireSession);
authApp.openapi(secureMeRoute, (c) => {
  c.header('X-Route', 'auth/me');
  const session = c.get('session');
  const user = c.get('user');
  const payload = {
    userId: user?.id ?? session?.userId ?? 'unknown',
    email: user?.email ?? null,
    activeOrganizationId: null as string | null,
  } as const;
  return ok(c, payload, undefined, HttpStatusCodes.OK);
});

// Export handlers for use in main index
export const authHandlers = {
  authApp,
};

// Keep the function export for backward compatibility if needed
