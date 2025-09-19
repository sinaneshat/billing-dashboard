import { useMemo } from 'react';

import type { ApiResponse } from '@/api/core/schemas';

import { usePaymentMethodsQuery } from './payment-methods';

/**
 * Type definitions for payment method and direct debit contract
 */
type PaymentMethod = {
  id: string;
  contractType: string;
  contractStatus: string;
  contractSignature?: string | null;
  isActive: boolean;
  contractExpiresAt?: string | null;
  contractMobile?: string | null;
  maxDailyAmount?: number | null;
  maxDailyCount?: number | null;
  maxMonthlyCount?: number | null;
  contractVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Direct debit contract status types
 */
export type DirectDebitContractStatus =
  | 'no_contract' // No contract exists
  | 'pending' // Contract initiated but not signed
  | 'active' // Active contract with valid signature
  | 'expired' // Contract has expired
  | 'cancelled' // Contract was cancelled
  | 'invalid'; // Contract exists but in invalid state

/**
 * Direct debit contract information
 */
export type DirectDebitContract = {
  status: DirectDebitContractStatus;
  contractId?: string;
  signature?: string;
  mobile?: string;
  maxDailyAmount?: number;
  maxDailyCount?: number;
  maxMonthlyCount?: number;
  expiresAt?: string;
  verifiedAt?: string;
  canMakePayments: boolean;
  needsSetup: boolean;
  message: string;
};

/**
 * Hook to check user's direct debit contract status
 *
 * Analyzes the user's payment methods to determine if they have a valid
 * direct debit contract that can be used for subscription payments.
 *
 * @returns DirectDebitContract information including status and capabilities
 */
export function useDirectDebitContract(): DirectDebitContract {
  const { data: paymentMethodsData, isLoading, error } = usePaymentMethodsQuery();

  return useMemo(() => {
    // While loading, assume no contract
    if (isLoading) {
      return {
        status: 'no_contract',
        canMakePayments: false,
        needsSetup: true,
        message: 'بررسی وضعیت قرارداد پرداخت مستقیم...',
      };
    }

    // If there's an error, assume no contract available
    if (error) {
      return {
        status: 'no_contract',
        canMakePayments: false,
        needsSetup: true,
        message: 'برای استفاده از پلن‌ها، ابتدا باید قرارداد پرداخت مستقیم را تنظیم کنید.',
      };
    }

    // Parse payment methods data
    const apiResponse = paymentMethodsData as ApiResponse<PaymentMethod[]> | undefined;
    const paymentMethods = apiResponse?.success && Array.isArray(apiResponse.data)
      ? apiResponse.data
      : [];

    // Find direct debit contracts
    const directDebitContracts = paymentMethods.filter(method =>
      method.contractType === 'direct_debit_contract',
    );

    // No direct debit contracts found
    if (directDebitContracts.length === 0) {
      return {
        status: 'no_contract',
        canMakePayments: false,
        needsSetup: true,
        message: 'برای استفاده از پلن‌ها، ابتدا باید قرارداد پرداخت مستقیم را تنظیم کنید.',
      };
    }

    // Find active contract
    const activeContract = directDebitContracts.find(contract =>
      contract.isActive
      && contract.contractStatus === 'active'
      && contract.contractSignature,
    );

    if (activeContract) {
      // Check if contract is expired
      const now = new Date();
      const expiresAt = activeContract.contractExpiresAt ? new Date(activeContract.contractExpiresAt) : null;

      if (expiresAt && expiresAt < now) {
        return {
          status: 'expired',
          contractId: activeContract.id,
          canMakePayments: false,
          needsSetup: true,
          message: 'قرارداد پرداخت مستقیم شما منقضی شده است. لطفا قرارداد جدیدی ایجاد کنید.',
        };
      }

      return {
        status: 'active',
        contractId: activeContract.id,
        signature: activeContract.contractSignature || undefined,
        mobile: activeContract.contractMobile || undefined,
        maxDailyAmount: activeContract.maxDailyAmount || undefined,
        maxDailyCount: activeContract.maxDailyCount || undefined,
        maxMonthlyCount: activeContract.maxMonthlyCount || undefined,
        expiresAt: activeContract.contractExpiresAt || undefined,
        verifiedAt: activeContract.contractVerifiedAt || undefined,
        canMakePayments: true,
        needsSetup: false,
        message: 'قرارداد پرداخت مستقیم فعال است. می‌توانید پلن مورد نظرتان را انتخاب کنید.',
      };
    }

    // Check for pending contracts
    const pendingContract = directDebitContracts.find(contract =>
      contract.contractStatus === 'pending_signature'
      || contract.contractStatus === 'pending',
    );

    if (pendingContract) {
      return {
        status: 'pending',
        contractId: pendingContract.id,
        canMakePayments: false,
        needsSetup: true,
        message: 'قرارداد پرداخت مستقیم در انتظار امضا است. لطفا فرآیند امضا را تکمیل کنید.',
      };
    }

    // Check for cancelled contracts
    const cancelledContract = directDebitContracts.find(contract =>
      contract.contractStatus === 'cancelled_by_user'
      || contract.contractStatus === 'cancelled',
    );

    if (cancelledContract) {
      return {
        status: 'cancelled',
        contractId: cancelledContract.id,
        canMakePayments: false,
        needsSetup: true,
        message: 'قرارداد پرداخت مستقیم لغو شده است. برای استفاده از پلن‌ها، قرارداد جدیدی ایجاد کنید.',
      };
    }

    // Invalid contract state
    return {
      status: 'invalid',
      canMakePayments: false,
      needsSetup: true,
      message: 'وضعیت قرارداد پرداخت مستقیم نامعلوم است. لطفا با پشتیبانی تماس بگیرید.',
    };
  }, [paymentMethodsData, isLoading, error]);
}

/**
 * Hook to check if user can create subscriptions
 *
 * Simple utility hook that returns whether the user has the necessary
 * setup to create and pay for subscriptions.
 *
 * @returns boolean indicating if user can create subscriptions
 */
export function useCanCreateSubscriptions(): boolean {
  const contract = useDirectDebitContract();
  return contract.canMakePayments;
}
