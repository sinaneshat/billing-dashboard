import { z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import * as HttpStatusPhrases from 'stoker/http-status-phrases';

// Shared Error schema used in OpenAPI responses and validation hooks
export const ErrorSchema = z.object({
  code: z.number().openapi({ example: HttpStatusCodes.BAD_REQUEST }),
  message: z.string().openapi({ example: HttpStatusPhrases.BAD_REQUEST }),
}).openapi('Error');

export type ErrorResponse = z.infer<typeof ErrorSchema>;

// Generic API response envelope
export function ApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.boolean().openapi({ example: true }),
    data: dataSchema.optional(),
    error: ErrorSchema.optional(),
    meta: z
      .object({
        requestId: z.string().optional().openapi({ example: 'req_123' }),
        timestamp: z.string().datetime().optional().openapi({ example: new Date().toISOString() }),
      })
      .optional(),
  });
}

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  meta?: { requestId?: string; timestamp?: string } & Record<string, unknown>;
};

export type ApiMeta = NonNullable<ApiResponse<unknown>['meta']>;

/**
 * Common reusable field schemas matching reference patterns
 */
export const CommonFieldSchemas = {
  uuid: () => z.string().uuid().openapi({ example: 'abc123e4-5678-9012-3456-789012345678' }),
  email: (required = false) => required ? z.string().email().openapi({ example: 'user@example.com' }) : z.string().email().optional().openapi({ example: 'user@example.com' }),
  page: () => z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
  limit: () => z.coerce.number().int().min(1).max(100).default(20).openapi({ example: 20 }),
  search: () => z.string().min(1).openapi({ example: 'search term' }),
  id: () => z.string().min(1).openapi({ example: 'id_123456789' }),
  url: () => z.string().url().openapi({ example: 'https://example.com' }),
  timestamp: () => z.string().datetime().openapi({ example: new Date().toISOString() }),
  currency: () => z.enum(['IRR', 'USD']).default('IRR').openapi({ example: 'IRR' }),
  amount: () => z.number().min(0).openapi({ example: 99000 }),
  description: () => z.string().min(1).max(500).openapi({ example: 'Product description' }),
  status: (values: readonly [string, ...string[]]) => z.enum(values).openapi({ example: values[0] }),
  sortOrder: () => z.enum(['asc', 'desc']).default('asc').openapi({ example: 'asc' }),
  billingPeriod: () => z.enum(['one_time', 'monthly']).openapi({ example: 'monthly' }),
};
