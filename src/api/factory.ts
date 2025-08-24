import { OpenAPIHono } from '@hono/zod-openapi';
import { createFactory } from 'hono/factory';
import defaultHook from 'stoker/openapi/default-hook';

import type { ApiEnv } from '@/api/types';

export const factory = createFactory<ApiEnv>({
  defaultAppOptions: { strict: true },
});

export function createOpenApiApp() {
  return new OpenAPIHono<ApiEnv>({
    defaultHook,
  });
}
