import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import {
  CancelContractResponseSchema,
  ContractCallbackQuerySchema,
  ContractCallbackResponseSchema,
  CreateContractRequestSchema,
  CreateContractResponseSchema,
  PaymentMethodListResponseSchema,
  SetDefaultResponseSchema,
  VerifyContractRequestSchema,
  VerifyContractResponseSchema,
} from './schema';

// ============================================================================
// BASIC PAYMENT METHODS ROUTES
// ============================================================================

export const getPaymentMethodsRoute = createRoute({
  method: 'get',
  path: '/payment-methods',
  tags: ['payment-methods'],
  summary: 'Get payment methods',
  description: 'List all payment methods for the authenticated user',
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: PaymentMethodListResponseSchema,
        },
      },
      description: 'Payment methods retrieved successfully',
    },
  },
});

/**
 * Set Default Payment Method - Atomic operation to set payment method as primary
 */
export const setDefaultPaymentMethodRoute = createRoute({
  method: 'patch',
  path: '/payment-methods/{id}/set-default',
  tags: ['payment-methods'],
  summary: 'Set payment method as default',
  description: 'Set a payment method as the default primary method for the user. Atomically ensures only one primary payment method per user.',
  request: {
    params: z.object({
      id: z.string().openapi({
        param: {
          name: 'id',
          in: 'path',
          description: 'Payment method ID',
          example: 'pm_123',
        },
      }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: SetDefaultResponseSchema,
        },
      },
      description: 'Payment method set as default successfully',
    },
  },
});

// ============================================================================
// CONSOLIDATED DIRECT DEBIT CONTRACT ROUTES (3 ENDPOINTS)
// ============================================================================

/**
 * 1. Create Contract - Consolidated endpoint that:
 *    - Creates ZarinPal Payman contract
 *    - Returns available banks
 *    - Provides signing URL template
 */
export const createContractRoute = createRoute({
  method: 'post',
  path: '/payment-methods/contracts',
  tags: ['payment-methods', 'direct-debit'],
  summary: 'Create direct debit contract',
  description: 'Create a new direct debit contract with ZarinPal Payman API. Returns contract details, available banks, and signing URL template.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateContractRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.CREATED]: {
      content: {
        'application/json': {
          schema: CreateContractResponseSchema,
        },
      },
      description: 'Contract created successfully with banks and signing URL',
    },
  },
});

/**
 * 2. Verify Contract - Handle callback from bank signing:
 *    - Verify contract signature with ZarinPal
 *    - Create payment method if successful
 *    - Return signature and payment method
 */
export const verifyContractRoute = createRoute({
  method: 'post',
  path: '/payment-methods/contracts/{id}/verify',
  tags: ['payment-methods', 'direct-debit'],
  summary: 'Verify signed contract',
  description: 'Verify a signed direct debit contract and create payment method. Called after user returns from bank signing process.',
  request: {
    params: z.object({
      id: z.string().openapi({
        param: {
          name: 'id',
          in: 'path',
          description: 'Contract ID',
          example: 'contract_123',
        },
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: VerifyContractRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: VerifyContractResponseSchema,
        },
      },
      description: 'Contract verified and payment method created',
    },
  },
});

/**
 * 3. Cancel Contract - Cancel direct debit contract:
 *    - Calls ZarinPal contract cancellation API
 *    - Updates payment method status
 *    - Required by ZarinPal terms of service
 */
export const cancelContractRoute = createRoute({
  method: 'delete',
  path: '/payment-methods/contracts/{id}',
  tags: ['payment-methods', 'direct-debit'],
  summary: 'Cancel direct debit contract',
  description: 'Cancel a direct debit contract. Required by ZarinPal terms - users must be able to cancel contracts.',
  request: {
    params: z.object({
      id: z.string().openapi({
        param: {
          name: 'id',
          in: 'path',
          description: 'Payment method ID or contract ID',
          example: 'pm_123',
        },
      }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: CancelContractResponseSchema,
        },
      },
      description: 'Contract cancelled successfully',
    },
  },
});

/**
 * 4. Public Contract Callback - Handle ZarinPal redirects:
 *    - No authentication required (public endpoint)
 *    - Verifies contract using payman_authority
 *    - Creates payment method for verified contracts
 *    - Used by ZarinPal redirect after bank signing
 */
export const contractCallbackRoute = createRoute({
  method: 'get',
  path: '/payment-methods/contracts/callback',
  tags: ['payment-methods', 'direct-debit', 'public'],
  summary: 'Handle contract callback',
  description: 'Public endpoint to handle ZarinPal contract signing callbacks. No authentication required.',
  request: {
    query: ContractCallbackQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: ContractCallbackResponseSchema,
        },
      },
      description: 'Contract callback processed successfully',
    },
  },
});

// ============================================================================
// ROUTE EXPORTS FOR REGISTRATION
// ============================================================================

export const consolidatedPaymentMethodRoutes = [
  // Basic payment method management
  getPaymentMethodsRoute,
  setDefaultPaymentMethodRoute,

  // Consolidated direct debit contract flow (4 endpoints)
  createContractRoute,
  verifyContractRoute,
  cancelContractRoute,
  contractCallbackRoute,

] as const;
