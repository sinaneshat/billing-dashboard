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

// ============================================================================
// ADDITIONAL REQUIRED ROUTES FOR COMPLETE DIRECT DEBIT FLOW
// ============================================================================

/**
 * Get Available Banks for Contract Signing
 * Separate endpoint for getting bank list
 */
export const getBankListRoute = createRoute({
  method: 'get',
  path: '/payment-methods/direct-debit/banks',
  tags: ['payment-methods'],
  summary: 'Get available banks for direct debit contract signing',
  description: `
    Returns list of banks available for ZarinPal direct debit contract signing.
    User must select one of these banks to complete the contract process.

    Each bank has different limits for daily amounts and transaction counts.
  `,
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Available banks retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            banks: z.array(z.object({
              name: z.string().openapi({ example: 'بانک ملی ایران' }),
              slug: z.string().openapi({ example: 'bmi' }),
              bankCode: z.string().openapi({ example: '011' }),
              maxDailyAmount: z.number().int().openapi({ example: 50000000 }),
              maxDailyCount: z.number().int().nullable().openapi({ example: 10 }),
            })),
          }),
        },
      },
    },
    ...CommonErrorResponses.auth,
  },
});

/**
 * Execute Direct Debit Payment (Step 3)
 * This is used for actual subscription billing
 */
export const executeDirectDebitPaymentRoute = createRoute({
  method: 'post',
  path: '/payment-methods/direct-debit/charge',
  tags: ['payment-methods'],
  summary: 'Execute direct debit payment for subscription billing',
  description: `
    **Step 3 of ZarinPal Direct Debit: Actual Payment Processing**

    Executes a direct debit transaction using a previously signed contract.
    This endpoint is used for subscription billing automation.

    **Process:**
    1. Create regular payment request to get authority
    2. Use this endpoint with authority + signature to execute payment
    3. Payment is processed automatically without user interaction

    **Currency:** All amounts must be in Iranian Rials (IRR).
    USD prices are automatically converted using real-time exchange rates.
  `,
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            paymentMethodId: z.string().uuid().openapi({
              description: 'Payment method ID (direct debit contract)',
            }),
            subscriptionId: z.string().uuid().openapi({
              description: 'Subscription being billed',
            }),
            usdAmount: z.number().positive().openapi({
              description: 'Amount in USD (will be converted to IRR)',
              example: 29.99,
            }),
            description: z.string().min(1).max(255).openapi({
              description: 'Payment description',
              example: 'Monthly subscription billing - January 2024',
            }),
            metadata: z.record(z.string(), z.unknown()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Payment executed successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            paymentId: z.string().uuid(),
            zarinpalRefId: z.string().optional(),
            irrAmount: z.number(),
            exchangeRate: z.number(),
            transactionDate: z.string().datetime(),
          }),
        },
      },
    },
    [HttpStatusCodes.PAYMENT_REQUIRED]: {
      description: 'Payment failed - insufficient funds or card issues',
      content: {
        'application/json': {
          schema: z.object({
            code: z.string(),
            message: z.string(),
            zarinpalCode: z.number().optional(),
          }),
        },
      },
    },
    ...CommonErrorResponses.auth,
    ...CommonErrorResponses.validation,
  },
});

/**
 * Cancel Direct Debit Contract
 * Allows users to cancel their direct debit contracts
 */
export const cancelDirectDebitContractRoute = createRoute({
  method: 'delete',
  path: '/payment-methods/direct-debit/{contractId}',
  tags: ['payment-methods'],
  summary: 'Cancel direct debit contract',
  description: `
    Cancels an active direct debit contract with ZarinPal.

    **Important:** Per ZarinPal requirements, users must be able to cancel
    their direct debit contracts at any time. This is a legal requirement.

    After cancellation:
    - No more automatic payments will be processed
    - Active subscriptions will be paused
    - User will need to set up a new payment method
  `,
  request: {
    params: z.object({
      contractId: z.string().uuid(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Contract cancelled successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            cancelledAt: z.string().datetime(),
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: {
      description: 'Contract not found',
    },
    ...CommonErrorResponses.auth,
  },
});

/**
 * Direct Debit Callback Handler
 * Handles ZarinPal redirect after contract signing
 */
export const directDebitCallbackRoute = createRoute({
  method: 'get',
  path: '/payment-methods/direct-debit/callback',
  tags: ['payment-methods'],
  summary: 'Handle ZarinPal direct debit contract callback',
  description: `
    **Callback URL for ZarinPal Direct Debit Contract Signing**

    This endpoint handles the redirect from ZarinPal after user completes
    (or cancels) the direct debit contract signing process.

    **Process:**
    1. ZarinPal redirects user here after bank interaction
    2. Parse status and payman_authority from query parameters
    3. Redirect to frontend with status information
    4. Frontend calls verify-direct-debit-contract endpoint
  `,
  request: {
    query: z.object({
      payman_authority: z.string().length(36),
      status: z.enum(['OK', 'NOK']),
    }),
  },
  responses: {
    [HttpStatusCodes.TEMPORARY_REDIRECT]: {
      description: 'Redirect to frontend with contract status',
      headers: z.object({
        Location: z.string().url(),
      }),
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Invalid callback parameters',
    },
  },
});
