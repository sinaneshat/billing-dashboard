/**
 * Card Addition API Routes
 * Handles ZarinPal Direct Payment card addition and verification flow
 */

import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { ApiResponseSchema, CommonErrorResponses, CommonFieldSchemas } from '@/api/common';

// ============================================================================
//  Card Addition Request Schema
// ============================================================================
const cardAdditionRequestSchema = z.object({
  callbackUrl: CommonFieldSchemas.url(),
  metadata: z.record(z.string(), z.unknown()).optional().openapi({
    description: 'Optional metadata to store with the card addition request',
  }),
});

const cardAdditionResponseSchema = z.object({
  verificationUrl: CommonFieldSchemas.url(),
  authority: z.string().openapi({
    description: 'ZarinPal authority token for this card verification',
  }),
  requestId: CommonFieldSchemas.uuid(),
});

// ============================================================================
//  Card Verification Schema
// ============================================================================
const cardVerificationRequestSchema = z.object({
  authority: z.string().openapi({
    description: 'ZarinPal authority token from card addition callback',
  }),
  status: z.string().optional().openapi({
    description: 'Status from ZarinPal callback',
  }),
});

const cardVerificationResponseSchema = z.object({
  paymentMethod: z.object({
    id: CommonFieldSchemas.uuid(),
    zarinpalCardHash: z.string(),
    cardMask: z.string(),
    cardType: z.string().nullable(),
    isPrimary: z.boolean(),
    isActive: z.boolean(),
    createdAt: CommonFieldSchemas.timestamp(),
  }).optional(),
  verified: z.boolean(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).optional(),
});

// ============================================================================
//  Direct Debit Setup Schema
// ============================================================================
const directDebitSetupRequestSchema = z.object({
  paymentMethodId: CommonFieldSchemas.uuid(),
  subscriptionId: CommonFieldSchemas.uuid().optional(),
});

const directDebitSetupResponseSchema = z.object({
  directDebitEnabled: z.boolean(),
  subscriptionId: CommonFieldSchemas.uuid().nullable(),
  enabledAt: CommonFieldSchemas.timestamp(),
});

// ============================================================================
//  Route Definitions
// ============================================================================

/**
 * POST /payment-methods/card-addition
 * Initiates card addition flow with ZarinPal Direct Payment
 */
export const initiateCardAdditionRoute = createRoute({
  path: '/payment-methods/card-addition',
  method: 'post',
  tags: ['Payment Methods'],
  summary: 'Initiate card addition flow',
  description: 'Starts the process of adding a new payment method via ZarinPal Direct Payment',
  request: {
    body: {
      content: {
        'application/json': { schema: cardAdditionRequestSchema },
      },
      description: 'Card addition request data',
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Card addition flow initiated successfully',
      content: {
        'application/json': { schema: ApiResponseSchema(cardAdditionResponseSchema) },
      },
    },
    ...CommonErrorResponses.read,
  },
});

/**
 * POST /payment-methods/verify-card
 * Verifies card addition and creates payment method
 */
export const verifyCardAdditionRoute = createRoute({
  path: '/payment-methods/verify-card',
  method: 'post',
  tags: ['Payment Methods'],
  summary: 'Verify card addition',
  description: 'Verifies the card addition with ZarinPal and creates the payment method',
  request: {
    body: {
      content: {
        'application/json': { schema: cardVerificationRequestSchema },
      },
      description: 'Card verification request data',
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Card verification completed',
      content: {
        'application/json': { schema: ApiResponseSchema(cardVerificationResponseSchema) },
      },
    },
    ...CommonErrorResponses.read,
  },
});

/**
 * POST /payment-methods/:id/enable-direct-debit
 * Enables direct debit for a payment method
 */
export const enableDirectDebitRoute = createRoute({
  path: '/payment-methods/{id}/enable-direct-debit',
  method: 'post',
  tags: ['Payment Methods'],
  summary: 'Enable direct debit for payment method',
  description: 'Enables automatic payments (direct debit) for a verified payment method',
  request: {
    params: z.object({
      id: CommonFieldSchemas.id(),
    }),
    body: {
      content: {
        'application/json': { schema: directDebitSetupRequestSchema },
      },
      description: 'Direct debit setup request data',
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Direct debit enabled successfully',
      content: {
        'application/json': { schema: ApiResponseSchema(directDebitSetupResponseSchema) },
      },
    },
    ...CommonErrorResponses.create,
  },
});

// ============================================================================
//  Schema Exports
// ============================================================================
export {
  cardAdditionRequestSchema,
  cardAdditionResponseSchema,
  cardVerificationRequestSchema,
  cardVerificationResponseSchema,
  directDebitSetupRequestSchema,
  directDebitSetupResponseSchema,
};
