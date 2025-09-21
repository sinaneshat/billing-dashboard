import type { GetPaymentMethodsResponse } from './payment-methods';

/**
 * Direct debit contract analysis service
 * Centralizes business logic for analyzing payment methods and contract status
 */

export type DirectDebitContractStatus = {
  status: 'active' | 'no_contract' | 'pending_signature' | 'cancelled_by_user' | 'expired';
  contractId?: string;
  signature?: string | null;
  mobile?: string | null;
  canMakePayments: boolean;
  needsSetup: boolean;
  message?: string;
};

// Reuse the inferred type from service response instead of creating inline types
type PaymentMethodData = NonNullable<GetPaymentMethodsResponse['data']>[number];

/**
 * Analyze payment methods data to determine direct debit contract status
 * Pure business logic function - no side effects, easily testable
 */
export function analyzeDirectDebitContract(
  paymentMethodsResponse: GetPaymentMethodsResponse,
): DirectDebitContractStatus {
  if (!paymentMethodsResponse.success || !paymentMethodsResponse.data) {
    return {
      status: 'no_contract',
      canMakePayments: false,
      needsSetup: true,
      message: 'No contract found',
    };
  }

  // Find active direct debit contract
  const activeContract = paymentMethodsResponse.data.find(
    (pm: PaymentMethodData) => pm.contractType === 'direct_debit_contract'
      && pm.contractStatus === 'active'
      && pm.isActive,
  );

  if (activeContract) {
    return {
      status: 'active',
      contractId: activeContract.id,
      signature: activeContract.contractSignature,
      mobile: activeContract.contractMobile,
      canMakePayments: true,
      needsSetup: false,
      message: 'Active contract ready for payments',
    };
  }

  // Check for pending contracts
  const pendingContract = paymentMethodsResponse.data.find(
    (pm: PaymentMethodData) => pm.contractType === 'direct_debit_contract'
      && pm.contractStatus === 'pending_signature',
  );

  if (pendingContract) {
    return {
      status: 'pending_signature',
      contractId: pendingContract.id,
      signature: pendingContract.contractSignature,
      mobile: pendingContract.contractMobile,
      canMakePayments: false,
      needsSetup: true,
      message: 'Contract pending signature',
    };
  }

  // Check for cancelled contracts
  const cancelledContract = paymentMethodsResponse.data.find(
    (pm: PaymentMethodData) => pm.contractType === 'direct_debit_contract'
      && pm.contractStatus === 'cancelled_by_user',
  );

  if (cancelledContract) {
    return {
      status: 'cancelled_by_user',
      contractId: cancelledContract.id,
      signature: cancelledContract.contractSignature,
      mobile: cancelledContract.contractMobile,
      canMakePayments: false,
      needsSetup: true,
      message: 'Contract was cancelled',
    };
  }

  // No contract found
  return {
    status: 'no_contract',
    canMakePayments: false,
    needsSetup: true,
    message: 'No contract setup yet',
  };
}

/**
 * Utility to check if user can create subscriptions
 * Based on contract analysis
 */
export function canCreateSubscriptions(contractStatus: DirectDebitContractStatus): boolean {
  return contractStatus.canMakePayments;
}
