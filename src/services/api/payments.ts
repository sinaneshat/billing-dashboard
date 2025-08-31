/**
 * Payments Service - 100% RPC Type Inference
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

// Get Payments
export type GetPaymentsRequest = InferRequestType<typeof apiClient.payments.$get>;
export type GetPaymentsResponse = InferResponseType<typeof apiClient.payments.$get>;

// Payment Callback
export type PaymentCallbackRequest = InferRequestType<typeof apiClient.payments.callback.$get>;
export type PaymentCallbackResponse = InferResponseType<typeof apiClient.payments.callback.$get>;

// Verify Payment
export type VerifyPaymentRequest = InferRequestType<typeof apiClient.payments.verify.$post>;
export type VerifyPaymentResponse = InferResponseType<typeof apiClient.payments.verify.$post>;

// ============================================================================
//  Service Functions
// ============================================================================

/**
 * Get all user payments (payment history)
 * All types are inferred from the RPC client
 */
export async function getPaymentsService(args?: GetPaymentsRequest) {
  return parseResponse(apiClient.payments.$get(args));
}

/**
 * Handle payment callback from ZarinPal
 * This is typically called from a callback page
 * All types are inferred from the RPC client
 */
export async function handlePaymentCallbackService(args: PaymentCallbackRequest) {
  return parseResponse(apiClient.payments.callback.$get(args));
}

/**
 * Manually verify a payment (for debugging/recovery)
 * All types are inferred from the RPC client
 */
export async function verifyPaymentService(args: VerifyPaymentRequest) {
  return parseResponse(apiClient.payments.verify.$post(args));
}
