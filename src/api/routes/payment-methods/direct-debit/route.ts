/**
 * ZarinPal Direct Debit Routes
 * Following official ZarinPal Payman (Direct Debit) documentation
 * https://docs.zarinpal.com/paymentGateway/directPayment.html
 */

import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import {
  InitiateDirectDebitRequestSchema,
  InitiateDirectDebitResponseSchema,
  VerifyDirectDebitContractRequestSchema,
  VerifyDirectDebitContractResponseSchema,
} from './schema';

// Standard error responses following unified system patterns
const StandardErrorResponses = {
  [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
  [HttpStatusCodes.UNAUTHORIZED]: { description: 'Unauthorized' },
  [HttpStatusCodes.UNPROCESSABLE_ENTITY]: { description: 'Validation Error' },
  [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
};

const CommonErrorResponses = {
  auth: StandardErrorResponses,
  validation: StandardErrorResponses,
};

// ============================================================================
// DIRECT DEBIT CONTRACT SETUP ROUTES
// ============================================================================

export const initiateDirectDebitContractRoute = createRoute({
  method: 'post',
  path: '/payment-methods/direct-debit-setup',
  tags: ['payment-methods'],
  summary: 'Set up ZarinPal direct debit contract',
  description: `
    **Step 1 of ZarinPal Direct Debit Setup**
    
    Creates a Payman contract with ZarinPal that allows future direct debit transactions.
    The user must complete contract signing with their bank using the returned URL.
    
    **Process:**
    1. This endpoint creates contract request with ZarinPal
    2. Returns available banks and signing URL template
    3. User selects bank and signs contract on ZarinPal
    4. User returns to callback URL
    5. Call verify-direct-debit-contract endpoint
    
    **Security Note:** Store paymanAuthority securely for verification step.
  `,
  request: {
    body: {
      content: {
        'application/json': {
          schema: InitiateDirectDebitRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Direct debit contract setup initiated successfully',
      content: {
        'application/json': {
          schema: InitiateDirectDebitResponseSchema,
        },
      },
    },
    ...CommonErrorResponses.auth,
    ...CommonErrorResponses.validation,
    [HttpStatusCodes.BAD_GATEWAY]: {
      description: 'ZarinPal service error',
      content: {
        'application/json': {
          schema: z.object({
            code: z.number(),
            message: z.string(),
          }),
        },
      },
    },
  },
});

/**
 * Step 2: Verify Direct Debit Contract
 * Called after user returns from bank contract signing
 */

export const verifyDirectDebitContractRoute = createRoute({
  method: 'post',
  path: '/payment-methods/verify-direct-debit-contract',
  tags: ['payment-methods'],
  summary: 'Verify signed direct debit contract',
  description: `
    **Step 2 of ZarinPal Direct Debit Setup**
    
    Verifies completed contract signing and creates payment method for direct debit.
    Call this endpoint after user returns from bank contract signing.
    
    **Process:**
    1. User completes contract signing on ZarinPal
    2. ZarinPal redirects to your callback URL with status
    3. Call this endpoint with status and contract details
    4. If successful, returns signature for direct payments
    
    **Important:** The returned signature must be stored securely and used for all
    direct debit transactions. It's equivalent to saved card information.
  `,
  request: {
    body: {
      content: {
        'application/json': {
          schema: VerifyDirectDebitContractRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Contract verification completed (check contractVerified field)',
      content: {
        'application/json': {
          schema: VerifyDirectDebitContractResponseSchema,
        },
      },
    },
    ...CommonErrorResponses.auth,
    ...CommonErrorResponses.validation,
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Invalid contract or verification failed',
      content: {
        'application/json': {
          schema: z.object({
            code: z.number(),
            message: z.string(),
          }),
        },
      },
    },
  },
});
