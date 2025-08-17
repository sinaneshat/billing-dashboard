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
