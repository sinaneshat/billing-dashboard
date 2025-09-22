import { z } from '@hono/zod-openapi';

import { createApiResponseSchema } from '@/api/core/schemas';

const HealthPayloadSchema = z.object({
  ok: z.boolean().openapi({
    example: true,
    description: 'Health check status indicator',
  }),
  status: z.enum(['healthy', 'degraded', 'unhealthy']).openapi({
    example: 'healthy',
    description: 'System health status',
  }),
  timestamp: z.string().datetime().openapi({
    example: new Date().toISOString(),
    description: 'Health check execution timestamp',
  }),
}).openapi('HealthPayload');

export const HealthResponseSchema = createApiResponseSchema(HealthPayloadSchema).openapi('HealthResponse');

const HealthCheckResultSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']).openapi({
    example: 'healthy',
    description: 'Health status of the checked component',
  }),
  message: z.string().openapi({
    example: 'Database is responsive',
    description: 'Human-readable health status message',
  }),
  duration: z.number().optional().openapi({
    example: 25,
    description: 'Health check execution time in milliseconds',
  }),
  details: z.record(z.string(), z.unknown()).optional().openapi({
    example: { missingVars: ['VAR_1', 'VAR_2'] },
    description: 'Additional health check details',
  }),
}).openapi('HealthCheckResult');

const DetailedHealthPayloadSchema = z.object({
  ok: z.boolean().openapi({
    example: true,
    description: 'Overall system health indicator',
  }),
  status: z.enum(['healthy', 'degraded', 'unhealthy']).openapi({
    example: 'healthy',
    description: 'Overall system health status',
  }),
  timestamp: z.string().datetime().openapi({
    example: new Date().toISOString(),
    description: 'Health check execution timestamp',
  }),
  duration: z.number().openapi({
    example: 150,
    description: 'Total health check execution time in milliseconds',
  }),
  env: z.object({
    runtime: z.string().openapi({
      example: 'cloudflare-workers',
      description: 'Runtime environment identifier',
    }),
    version: z.string().openapi({
      example: 'Node.js/22',
      description: 'Runtime version information',
    }),
    nodeEnv: z.string().openapi({
      example: 'production',
      description: 'Node.js environment mode',
    }),
  }).openapi({
    description: 'Runtime environment information',
  }),
  dependencies: z.record(z.string(), HealthCheckResultSchema).openapi({
    example: {
      database: { status: 'healthy', message: 'Database is responsive', duration: 25 },
      environment: { status: 'healthy', message: 'All required environment variables are present' },
    },
    description: 'Individual component health check results',
  }),
  summary: z.object({
    total: z.number().int().positive().openapi({
      example: 6,
      description: 'Total number of health checks performed',
    }),
    healthy: z.number().int().nonnegative().openapi({
      example: 5,
      description: 'Number of healthy components',
    }),
    degraded: z.number().int().nonnegative().openapi({
      example: 1,
      description: 'Number of degraded components',
    }),
    unhealthy: z.number().int().nonnegative().openapi({
      example: 0,
      description: 'Number of unhealthy components',
    }),
  }).openapi({
    description: 'Health check summary statistics',
  }),
}).openapi('DetailedHealthPayload');

export const DetailedHealthResponseSchema = createApiResponseSchema(DetailedHealthPayloadSchema).openapi('DetailedHealthResponse');

// ============================================================================
// TYPE EXPORTS FOR FRONTEND
// ============================================================================

export type HealthPayload = z.infer<typeof HealthPayloadSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>;
export type DetailedHealthPayload = z.infer<typeof DetailedHealthPayloadSchema>;
export type DetailedHealthResponse = z.infer<typeof DetailedHealthResponseSchema>;
