import { OpenAPIHono } from '@hono/zod-openapi';
import { createFactory } from 'hono/factory';

import type { ApiEnv } from '@/api/types';

export const factory = createFactory<ApiEnv>({
  defaultAppOptions: { strict: true },
});

export const createOpenApiApp = () => new OpenAPIHono<ApiEnv>();
