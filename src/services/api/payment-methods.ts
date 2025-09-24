/**
 * Payment Methods Service - 100% RPC Type Inference
 *
 * This service uses Hono's InferRequestType and InferResponseType
 * for complete type safety without any hardcoded types.
 */

import type { InferRequestType, InferResponseType } from 'hono/client';
import { parseResponse } from 'hono/client';

import type { ApiClientType } from '@/api/client';
import { createApiClient } from '@/api/client';

// ============================================================================
//  Inferred Types for Components
// ============================================================================

// These types are 100% inferred from the RPC client
// Using centralized ApiClientType from @/api/client

// Get Payment Methods
export type GetPaymentMethodsRequest = InferRequestType<ApiClientType['payment-methods']['$get']>;
export type GetPaymentMethodsResponse = InferResponseType<ApiClientType['payment-methods']['$get']>;

// Traditional payment method creation removed - use direct debit contract verification

// Delete Payment Method - now handled by cancel contract endpoint

// ============================================================================
//  Service Functions
// ============================================================================

/**
 * Get all user payment methods - Context7 consistent pattern
 * All types are inferred from the RPC client
 * CRITICAL FIX: Consistent argument handling for SSR/hydration
 */
export async function getPaymentMethodsService(args?: GetPaymentMethodsRequest) {
  const client = await createApiClient();
  // Fix: Only pass args if defined to ensure consistent behavior between server/client
  return args
    ? parseResponse(client['payment-methods'].$get(args))
    : parseResponse(client['payment-methods'].$get());
}

// Traditional payment method creation removed - use direct debit contract verification

// Set Default Payment Method
export type SetDefaultPaymentMethodRequest = InferRequestType<ApiClientType['payment-methods'][':id']['set-default']['$patch']>;
export type SetDefaultPaymentMethodResponse = InferResponseType<ApiClientType['payment-methods'][':id']['set-default']['$patch']>;

/**
 * Set payment method as default
 * All types are inferred from the RPC client
 */
export async function setDefaultPaymentMethodService(args: SetDefaultPaymentMethodRequest) {
  const client = await createApiClient();
  return parseResponse(client['payment-methods'][':id']['set-default'].$patch(args));
}

// ============================================================================
//  Consolidated Direct Debit Contract Services (NEW - ZarinPal Payman API)
// ============================================================================

// Create Direct Debit Contract (Step 1) - Returns banks and signing URL
export type CreateDirectDebitContractRequest = InferRequestType<ApiClientType['payment-methods']['contracts']['$post']>;
export type CreateDirectDebitContractResponse = InferResponseType<ApiClientType['payment-methods']['contracts']['$post']>;

// Verify Direct Debit Contract (Step 2) - Called after bank signing
export type VerifyDirectDebitContractRequest = InferRequestType<ApiClientType['payment-methods']['contracts'][':id']['verify']['$post']>;
export type VerifyDirectDebitContractResponse = InferResponseType<ApiClientType['payment-methods']['contracts'][':id']['verify']['$post']>;

// Cancel Direct Debit Contract (Step 3) - Cancel active contract
export type CancelDirectDebitContractRequest = InferRequestType<ApiClientType['payment-methods']['contracts'][':id']['$delete']>;
export type CancelDirectDebitContractResponse = InferResponseType<ApiClientType['payment-methods']['contracts'][':id']['$delete']>;

// Recover Direct Debit Contract - Recover failed contract verifications
export type RecoverDirectDebitContractRequest = InferRequestType<ApiClientType['payment-methods']['contracts']['recover']['$post']>;
export type RecoverDirectDebitContractResponse = InferResponseType<ApiClientType['payment-methods']['contracts']['recover']['$post']>;

/**
 * Create Direct Debit Contract (Step 1)
 * Creates contract with ZarinPal and returns bank selection options + signing URL
 * Consolidated endpoint that replaces separate request + banks endpoints
 */
export async function createDirectDebitContractService(args: CreateDirectDebitContractRequest) {
  const client = await createApiClient();
  return parseResponse(client['payment-methods'].contracts.$post(args));
}

/**
 * Verify Direct Debit Contract (Step 2)
 * Called after user signs contract with bank to get signature and create payment method
 */
export async function verifyDirectDebitContractService(args: VerifyDirectDebitContractRequest) {
  const client = await createApiClient();
  return parseResponse(client['payment-methods'].contracts[':id'].verify.$post(args));
}

/**
 * Cancel Direct Debit Contract (Step 3)
 * Allows users to cancel their direct debit contracts (legally required)
 */
export async function cancelDirectDebitContractService(args: CancelDirectDebitContractRequest) {
  const client = await createApiClient();
  return parseResponse(client['payment-methods'].contracts[':id'].$delete(args));
}

/**
 * Recover Direct Debit Contract
 * Recovers failed contract verifications using payman authority
 */
export async function recoverDirectDebitContractService(args: RecoverDirectDebitContractRequest) {
  const client = await createApiClient();
  return parseResponse(client['payment-methods'].contracts.recover.$post(args));
}
