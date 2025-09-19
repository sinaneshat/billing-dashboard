import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { createApiResponseSchema } from '@/api/core/schemas';

import {
  BankSelectionRequestSchema,
  GenerateSigningUrlResponseSchema,
  GetContractSigningInfoResponseSchema,
  SignContractParamsSchema,
} from './schema';

/**
 * GET /payment-methods/{id}/sign - Get contract signing information
 */
export const getContractSigningInfoRoute = createRoute({
  method: 'get',
  path: '/payment-methods/{id}/sign',
  summary: 'Get contract signing information',
  description: 'Returns available banks and current contract status for signing',
  tags: ['Payment Methods'],
  request: {
    params: SignContractParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Contract signing information retrieved successfully',
      content: {
        'application/json': { schema: GetContractSigningInfoResponseSchema },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: {
      description: 'Contract not found or cannot be signed',
      content: {
        'application/json': { schema: createApiResponseSchema(z.object({ message: z.string() })) },
      },
    },
    [HttpStatusCodes.FORBIDDEN]: {
      description: 'Contract does not belong to user',
      content: {
        'application/json': { schema: createApiResponseSchema(z.object({ message: z.string() })) },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

/**
 * POST /payment-methods/{id}/sign - Generate bank signing URL
 */
export const generateSigningUrlRoute = createRoute({
  method: 'post',
  path: '/payment-methods/{id}/sign',
  summary: 'Generate bank signing URL',
  description: 'Generates ZarinPal signing URL for selected bank',
  tags: ['Payment Methods'],
  request: {
    params: SignContractParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: BankSelectionRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Signing URL generated successfully',
      content: {
        'application/json': { schema: GenerateSigningUrlResponseSchema },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: {
      description: 'Contract not found',
      content: {
        'application/json': { schema: createApiResponseSchema(z.object({ message: z.string() })) },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Invalid bank selection or contract cannot be signed',
      content: {
        'application/json': { schema: createApiResponseSchema(z.object({ message: z.string() })) },
      },
    },
    [HttpStatusCodes.FORBIDDEN]: {
      description: 'Contract does not belong to user',
      content: {
        'application/json': { schema: createApiResponseSchema(z.object({ message: z.string() })) },
      },
    },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});
