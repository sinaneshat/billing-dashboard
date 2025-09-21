/**
 * Payment Methods Service - 100% RPC Type Inference
 *
 * This service uses Hono's InferRequestType and InferResponseType
 * for complete type safety without any hardcoded types.
 */

import type { InferRequestType, InferResponseType } from 'hono/client';
import { parseResponse } from 'hono/client';

import { apiClient } from '@/api/client';

// ============================================================================
//  Inferred Types for Components
// ============================================================================

// Get Payment Methods
export type GetPaymentMethodsRequest = InferRequestType<(typeof apiClient)['payment-methods']['$get']>;
export type GetPaymentMethodsResponse = InferResponseType<(typeof apiClient)['payment-methods']['$get']>;

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
  // Fix: Only pass args if defined to ensure consistent behavior between server/client
  return args
    ? parseResponse(apiClient['payment-methods'].$get(args))
    : parseResponse(apiClient['payment-methods'].$get());
}

// Traditional payment method creation removed - use direct debit contract verification

// Set Default Payment Method
export type SetDefaultPaymentMethodRequest = InferRequestType<(typeof apiClient)['payment-methods'][':id']['set-default']['$patch']>;
export type SetDefaultPaymentMethodResponse = InferResponseType<(typeof apiClient)['payment-methods'][':id']['set-default']['$patch']>;

/**
 * Set payment method as default
 * All types are inferred from the RPC client
 */
export async function setDefaultPaymentMethodService(args: SetDefaultPaymentMethodRequest) {
  return parseResponse(apiClient['payment-methods'][':id']['set-default'].$patch(args));
}

// ============================================================================
//  Consolidated Direct Debit Contract Services (NEW - ZarinPal Payman API)
// ============================================================================

// Create Direct Debit Contract (Step 1) - Returns banks and signing URL
export type CreateDirectDebitContractRequest = InferRequestType<(typeof apiClient)['payment-methods']['contracts']['$post']>;
export type CreateDirectDebitContractResponse = InferResponseType<(typeof apiClient)['payment-methods']['contracts']['$post']>;

// Verify Direct Debit Contract (Step 2) - Called after bank signing
export type VerifyDirectDebitContractRequest = InferRequestType<(typeof apiClient)['payment-methods']['contracts'][':id']['verify']['$post']>;
export type VerifyDirectDebitContractResponse = InferResponseType<(typeof apiClient)['payment-methods']['contracts'][':id']['verify']['$post']>;

// Cancel Direct Debit Contract (Step 3) - Cancel active contract
export type CancelDirectDebitContractRequest = InferRequestType<(typeof apiClient)['payment-methods']['contracts'][':id']['$delete']>;
export type CancelDirectDebitContractResponse = InferResponseType<(typeof apiClient)['payment-methods']['contracts'][':id']['$delete']>;

/**
 * Create Direct Debit Contract (Step 1)
 * Creates contract with ZarinPal and returns bank selection options + signing URL
 * Consolidated endpoint that replaces separate request + banks endpoints
 */
export async function createDirectDebitContractService(args: CreateDirectDebitContractRequest) {
  return parseResponse(apiClient['payment-methods'].contracts.$post(args));
}

/**
 * Verify Direct Debit Contract (Step 2)
 * Called after user signs contract with bank to get signature and create payment method
 */
export async function verifyDirectDebitContractService(args: VerifyDirectDebitContractRequest) {
  return parseResponse(apiClient['payment-methods'].contracts[':id'].verify.$post(args));
}

/**
 * Cancel Direct Debit Contract (Step 3)
 * Allows users to cancel their direct debit contracts (legally required)
 */
export async function cancelDirectDebitContractService(args: CancelDirectDebitContractRequest) {
  return parseResponse(apiClient['payment-methods'].contracts[':id'].$delete(args));
}
