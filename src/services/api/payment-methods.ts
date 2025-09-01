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

// ============================================================================
//  Service Functions
// ============================================================================

/**
 * Get all user payment methods
 * All types are inferred from the RPC client
 */
export async function getPaymentMethodsService(args?: GetPaymentMethodsRequest) {
  return parseResponse(apiClient['payment-methods'].$get(args));
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

// ============================================================================
//  New Card Addition Services
// ============================================================================

/**
 * Initiate card addition flow with ZarinPal
 * Returns verification URL to redirect user to
 */
export async function initiateCardAdditionService(callbackUrl: string, metadata?: Record<string, unknown>) {
  return parseResponse(apiClient['payment-methods']['card-addition'].$post({
    json: {
      callbackUrl,
      metadata,
    },
  }));
}

/**
 * Verify card addition after user returns from ZarinPal
 * Creates payment method record if verification successful
 */
export async function verifyCardAdditionService(authority: string, status?: string) {
  return parseResponse(apiClient['payment-methods']['verify-card'].$post({
    json: {
      authority,
      status,
    },
  }));
}

/**
 * Enable direct debit for a payment method
 * Optionally link to a specific subscription
 */
export async function enableDirectDebitService(paymentMethodId: string, subscriptionId?: string) {
  return parseResponse(apiClient['payment-methods'][':id']['enable-direct-debit'].$post({
    param: { id: paymentMethodId },
    json: {
      paymentMethodId,
      subscriptionId,
    },
  }));
}
