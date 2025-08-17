import * as HttpStatusCodes from 'stoker/http-status-codes';

import { ok } from '@/api/common/responses';
import { createOpenApiApp } from '@/api/factory';

import { detailedHealthRoute, healthRoute } from './route';

// Create system app with all system-related routes
const systemApp = createOpenApiApp()
  .openapi(healthRoute, (c) => {
    c.header('X-Route', 'system/health');
    return ok(c, { ok: true, status: 'healthy', timestamp: new Date().toISOString() }, undefined, HttpStatusCodes.OK);
  })
  .openapi(detailedHealthRoute, (c) => {
    return ok(c, {
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      env: {
        runtime: typeof process !== 'undefined' ? 'node' : 'edge',
        version: typeof process !== 'undefined' ? process.version : 'edge',
      },
      dependencies: {
        database: 'ok',
      },
    }, undefined, HttpStatusCodes.OK);
  });

// Export handlers for use in main index
export const systemHandlers = {
  systemApp,
};

// Keep the function export for backward compatibility if needed
export function createSystemApp() {
  return systemApp;
}
