import { z } from '@hono/zod-openapi';

import { createApiResponseSchema } from '@/api/core/schemas';

const HealthPayloadSchema = z.object({
  ok: z.boolean().openapi({ example: true }),
  status: z.string().openapi({ example: 'healthy' }),
  timestamp: z.string().datetime().openapi({ example: new Date().toISOString() }),
});

export const HealthResponseSchema = createApiResponseSchema(HealthPayloadSchema).openapi('HealthResponse');

const HealthCheckResultSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  message: z.string(),
  duration: z.number().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

const DetailedHealthPayloadSchema = z.object({
  ok: z.boolean().openapi({ example: true }),
  status: z.string().openapi({ example: 'healthy' }),
  timestamp: z.string().datetime().openapi({ example: new Date().toISOString() }),
  duration: z.number().openapi({ example: 150 }),
  env: z.object({
    runtime: z.string().openapi({ example: 'cloudflare-workers' }),
    version: z.string().openapi({ example: 'workers-runtime' }),
    nodeEnv: z.string().openapi({ example: 'production' }),
  }),
  dependencies: z.record(z.string(), HealthCheckResultSchema).openapi({
    example: {
      database: { status: 'healthy', message: 'Database is healthy', duration: 25 },
      environment: { status: 'healthy', message: 'Environment configuration is valid' },
    },
  }),
  summary: z.object({
    total: z.number().openapi({ example: 6 }),
    healthy: z.number().openapi({ example: 5 }),
    degraded: z.number().openapi({ example: 1 }),
    unhealthy: z.number().openapi({ example: 0 }),
  }),
});

export const DetailedHealthResponseSchema = createApiResponseSchema(DetailedHealthPayloadSchema).openapi('DetailedHealthResponse');

// ============================================================================
// TYPE EXPORTS FOR FRONTEND
// ============================================================================

export type HealthPayload = z.infer<typeof HealthPayloadSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>;
export type DetailedHealthPayload = z.infer<typeof DetailedHealthPayloadSchema>;
export type DetailedHealthResponse = z.infer<typeof DetailedHealthResponseSchema>;
