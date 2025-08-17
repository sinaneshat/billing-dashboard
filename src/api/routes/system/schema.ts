import { z } from '@hono/zod-openapi';

import { ApiResponseSchema } from '@/api/common/schemas';

const HealthPayloadSchema = z.object({
  ok: z.boolean().openapi({ example: true }),
  status: z.string().openapi({ example: 'healthy' }),
  timestamp: z.string().datetime().openapi({ example: new Date().toISOString() }),
});

export const HealthResponseSchema = ApiResponseSchema(HealthPayloadSchema).openapi('HealthResponse');

const DetailedHealthPayloadSchema = z.object({
  ok: z.boolean().openapi({ example: true }),
  status: z.string().openapi({ example: 'healthy' }),
  timestamp: z.string().datetime().openapi({ example: new Date().toISOString() }),
  env: z.object({
    runtime: z.string().openapi({ example: 'node' }),
    version: z.string().openapi({ example: process.version }),
  }),
  dependencies: z
    .object({
      database: z.string().openapi({ example: 'ok' }),
    })
    .openapi({ example: { database: 'ok' } }),
});

export const DetailedHealthResponseSchema = ApiResponseSchema(DetailedHealthPayloadSchema).openapi('DetailedHealthResponse');
