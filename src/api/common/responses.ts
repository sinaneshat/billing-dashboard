import type { Context } from 'hono';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { ApiMeta, ApiResponse, ErrorResponse } from '@/api/common/schemas';

export function validationError(c: Context) {
  return c.json({ code: HttpStatusCodes.UNPROCESSABLE_ENTITY, message: 'Validation Error' } satisfies ErrorResponse, HttpStatusCodes.UNPROCESSABLE_ENTITY);
}

export function badRequest(c: Context, message = 'Bad Request') {
  return c.json({ code: HttpStatusCodes.BAD_REQUEST, message } satisfies ErrorResponse, HttpStatusCodes.BAD_REQUEST);
}

export function notFound(c: Context, message = 'Not Found') {
  return c.json({ code: HttpStatusCodes.NOT_FOUND, message } satisfies ErrorResponse, HttpStatusCodes.NOT_FOUND);
}

type OkStatus = typeof HttpStatusCodes.OK;
export type ErrorStatus
  = typeof HttpStatusCodes.BAD_REQUEST
    | typeof HttpStatusCodes.UNAUTHORIZED
    | typeof HttpStatusCodes.FORBIDDEN
    | typeof HttpStatusCodes.NOT_FOUND
    | typeof HttpStatusCodes.CONFLICT
    | typeof HttpStatusCodes.UNPROCESSABLE_ENTITY
    | typeof HttpStatusCodes.TOO_MANY_REQUESTS
    | typeof HttpStatusCodes.INTERNAL_SERVER_ERROR;

export function ok<T>(c: Context, data: T, meta?: ApiMeta, status: OkStatus = HttpStatusCodes.OK) {
  return c.json({ success: true, data, meta } satisfies ApiResponse<T>, status);
}

export function created<T>(c: Context, data: T, meta?: ApiMeta) {
  return c.json({ success: true, data, meta } satisfies ApiResponse<T>, HttpStatusCodes.CREATED);
}

export function error(c: Context, code: ErrorStatus, message: string, details?: unknown, requestId?: string) {
  return c.json({
    success: false,
    error: { code, message, timestamp: new Date().toISOString(), details, requestId },
  }, code);
}

export function fail(c: Context, error: ErrorResponse, meta?: ApiMeta, status: ErrorStatus = HttpStatusCodes.BAD_REQUEST) {
  return c.json({ success: false, error, meta } satisfies ApiResponse<unknown>, status);
}
