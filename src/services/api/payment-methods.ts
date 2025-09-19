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

// Create Payment Method
export type CreatePaymentMethodRequest = InferRequestType<(typeof apiClient)['payment-methods']['$post']>;
export type CreatePaymentMethodResponse = InferResponseType<(typeof apiClient)['payment-methods']['$post']>;

// Delete Payment Method
export type DeletePaymentMethodRequest = {
  param: { id: string };
};
export type DeletePaymentMethodResponse = InferResponseType<(typeof apiClient)['payment-methods'][':id']['$delete']>;

// Set Default Payment Method
export type SetDefaultPaymentMethodRequest = {
  param: { id: string };
};
export type SetDefaultPaymentMethodResponse = InferResponseType<(typeof apiClient)['payment-methods'][':id']['default']['$patch']>;

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

/**
 * Create a new payment method
 * All types are inferred from the RPC client
 */
export async function createPaymentMethodService(args: CreatePaymentMethodRequest) {
  return parseResponse(apiClient['payment-methods'].$post(args));
}

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
 * Set a payment method as the default/primary method
 * All types are inferred from the RPC client
 */
export async function setDefaultPaymentMethodService(paymentMethodId: string) {
  return parseResponse(apiClient['payment-methods'][':id'].default.$patch({
    param: { id: paymentMethodId },
  }));
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
//  Direct Debit Contract Services (NEW - ZarinPal Payman API)
// ============================================================================

// Direct Debit Contract Setup
export type InitiateDirectDebitContractRequest = InferRequestType<(typeof apiClient)['payment-methods']['direct-debit']['setup']['$post']>;
export type InitiateDirectDebitContractResponse = InferResponseType<(typeof apiClient)['payment-methods']['direct-debit']['setup']['$post']>;

// Direct Debit Contract Verification
export type VerifyDirectDebitContractRequest = InferRequestType<(typeof apiClient)['payment-methods']['direct-debit']['verify']['$post']>;
export type VerifyDirectDebitContractResponse = InferResponseType<(typeof apiClient)['payment-methods']['direct-debit']['verify']['$post']>;

// Get Available Banks
export type GetBankListRequest = InferRequestType<(typeof apiClient)['payment-methods']['direct-debit']['banks']['$get']>;
export type GetBankListResponse = InferResponseType<(typeof apiClient)['payment-methods']['direct-debit']['banks']['$get']>;

// Execute Direct Debit Payment
export type ExecuteDirectDebitPaymentRequest = InferRequestType<(typeof apiClient)['payment-methods']['direct-debit']['charge']['$post']>;
export type ExecuteDirectDebitPaymentResponse = InferResponseType<(typeof apiClient)['payment-methods']['direct-debit']['charge']['$post']>;

// Cancel Direct Debit Contract
export type CancelDirectDebitContractRequest = {
  param: { contractId: string };
};
export type CancelDirectDebitContractResponse = InferResponseType<(typeof apiClient)['payment-methods']['direct-debit'][':contractId']['$delete']>;

/**
 * Initiate Direct Debit Contract Setup (Step 1)
 * Creates contract with ZarinPal and returns bank selection options
 */
export async function initiateDirectDebitContractService(args: InitiateDirectDebitContractRequest) {
  return parseResponse(apiClient['payment-methods']['direct-debit'].setup.$post(args));
}

/**
 * Verify Direct Debit Contract (Step 2)
 * Called after user signs contract with bank to get signature
 */
export async function verifyDirectDebitContractService(args: VerifyDirectDebitContractRequest) {
  return parseResponse(apiClient['payment-methods']['direct-debit'].verify.$post(args));
}

/**
 * Get Available Banks for Direct Debit Contract Signing
 * Returns list of banks with their limits and capabilities
 */
export async function getBankListService(args?: GetBankListRequest) {
  return args
    ? parseResponse(apiClient['payment-methods']['direct-debit'].banks.$get(args))
    : parseResponse(apiClient['payment-methods']['direct-debit'].banks.$get());
}

/**
 * Execute Direct Debit Payment for Subscription Billing
 * Charges user using signed direct debit contract with currency conversion
 */
export async function executeDirectDebitPaymentService(args: ExecuteDirectDebitPaymentRequest) {
  return parseResponse(apiClient['payment-methods']['direct-debit'].charge.$post(args));
}

/**
 * Cancel Direct Debit Contract
 * Allows users to cancel their direct debit contracts (legally required)
 */
export async function cancelDirectDebitContractService(contractId: string) {
  return parseResponse(apiClient['payment-methods']['direct-debit'][':contractId'].$delete({
    param: { contractId },
  }));
}
