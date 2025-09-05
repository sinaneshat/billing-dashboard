/**
 * Payment Service - 100% RPC Type Inference
 *
 * This service uses Hono's InferRequestType and InferResponseType
 * for complete type safety without any hardcoded types.
 */

import type { InferRequestType, InferResponseType } from 'hono/client';

import { apiClient } from '@/api/client';

// ============================================================================
//  Inferred Types for Components
// ============================================================================

// Get Payments (no query parameters) - Fix type inference issue
export type GetPaymentsResponse = {
  success: boolean;
  data?: Array<{
    id: string;
    userId: string;
    subscriptionId: string | null;
    productId: string;
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string;
    zarinpalAuthority: string | null;
    zarinpalRefId: string | null;
    paidAt: string | null;
    createdAt: string;
    updatedAt: string;
    product: {
      id: string;
      name: string;
      description: string | null;
    } | null;
    subscription: {
      id: string;
      status: string;
    } | null;
  }>;
  error?: {
    code: number;
    message: string;
  };
  meta?: {
    requestId?: string;
    timestamp?: string;
    version?: string;
    [key: string]: unknown;
  };
};

// Payment Callback
export type PaymentCallbackRequest = InferRequestType<(typeof apiClient)['payments']['callback']['$get']>['query'];
export type PaymentCallbackResponse = InferResponseType<(typeof apiClient)['payments']['callback']['$get']>;

// ============================================================================
//  Service Functions
// ============================================================================

/**
 * Fetch all payments for the authenticated user
 */
export async function getPaymentsService(): Promise<GetPaymentsResponse> {
  const response = await apiClient.payments.$get();

  if (!response.ok) {
    const errorData = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(errorData?.message || `Failed to fetch payments (${response.status})`);
  }

  return response.json();
}

/**
 * Process payment callback from ZarinPal
 */
export async function processPaymentCallbackService(request: PaymentCallbackRequest): Promise<PaymentCallbackResponse> {
  const response = await apiClient.payments.callback.$get({
    query: request,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(errorData?.message || `Payment processing failed (${response.status})`);
  }

  return response.json();
}
