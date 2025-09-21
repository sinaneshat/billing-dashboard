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

// Delete Payment Method
export type DeletePaymentMethodRequest = {
  param: { id: string };
};
export type DeletePaymentMethodResponse = InferResponseType<(typeof apiClient)['payment-methods'][':id']['$delete']>;

// Update Payment Method (e.g., set as primary)
export type UpdatePaymentMethodRequest = {
  param: { id: string };
  json: { isPrimary?: boolean };
};
export type UpdatePaymentMethodResponse = InferResponseType<(typeof apiClient)['payment-methods'][':id']['$patch']>;

// Contract Status
export type GetContractStatusRequest = InferRequestType<(typeof apiClient)['payment-methods']['contract-status']['$get']>;
export type GetContractStatusResponse = InferResponseType<(typeof apiClient)['payment-methods']['contract-status']['$get']>;

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

/**
 * Delete a payment method (soft delete)
 * All types are inferred from the RPC client
 */
export async function deletePaymentMethodService(paymentMethodId: string) {
  return parseResponse(apiClient['payment-methods'][':id'].$delete({
    param: { id: paymentMethodId },
  }));
}

/**
 * Update a payment method (e.g., set as primary)
 * All types are inferred from the RPC client
 */
export async function updatePaymentMethodService(paymentMethodId: string, updates: { isPrimary?: boolean }) {
  return parseResponse(apiClient['payment-methods'][':id'].$patch({
    param: { id: paymentMethodId },
    json: updates,
  }));
}

/**
 * Set a payment method as the default/primary method
 * Convenience function for updatePaymentMethodService
 */
export async function setDefaultPaymentMethodService(paymentMethodId: string) {
  return updatePaymentMethodService(paymentMethodId, { isPrimary: true });
}

/**
 * Get direct debit contract status
 * All types are inferred from the RPC client
 */
export async function getContractStatusService(args?: GetContractStatusRequest) {
  return args
    ? parseResponse(apiClient['payment-methods']['contract-status'].$get(args))
    : parseResponse(apiClient['payment-methods']['contract-status'].$get());
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
export type CancelDirectDebitContractRequest = {
  param: { id: string };
};
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
 * Legacy alias for createDirectDebitContractService (backwards compatibility)
 */
export const initiateDirectDebitContractService = createDirectDebitContractService;

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
export async function cancelDirectDebitContractService(paymentMethodId: string) {
  return parseResponse(apiClient['payment-methods'].contracts[':id'].$delete({
    param: { id: paymentMethodId },
  }));
}

/**
 * Get Available Banks for Direct Debit Contract Signing
 * @deprecated Banks are now returned in createDirectDebitContractService response
 * This function is kept for backwards compatibility but should not be used
 */
export async function getBankListService() {
  console.warn('getBankListService is deprecated. Banks are now returned in createDirectDebitContractService response.');
  throw new Error('getBankListService is deprecated. Use createDirectDebitContractService instead.');
}
