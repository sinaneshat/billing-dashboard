import type { Context } from 'hono';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { ApiMeta, ApiResponse, ErrorResponse } from '@/api/common/schemas';

export function validationError(c: Context) {
  return c.json({ code: 422, message: 'Validation Error' } satisfies ErrorResponse, 422);
}

export function badRequest(c: Context, message = 'Bad Request') {
  return c.json({ code: 400, message } satisfies ErrorResponse, 400);
}

export function notFound(c: Context, message = 'Not Found') {
  return c.json({ code: 404, message } satisfies ErrorResponse, 404);
}

type OkStatus = typeof HttpStatusCodes.OK;
type ErrorStatus =
  | typeof HttpStatusCodes.BAD_REQUEST
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

export function fail(c: Context, error: ErrorResponse, meta?: ApiMeta, status: ErrorStatus = HttpStatusCodes.BAD_REQUEST) {
  return c.json({ success: false, error, meta } satisfies ApiResponse<unknown>, status);
}
