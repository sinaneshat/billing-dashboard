'use client';

import { useLocale, useTranslations } from 'next-intl';
import { memo } from 'react';

import type { PaymentData } from './unified';
import { BillingDisplayContainer, mapPaymentToContent } from './unified';

// Simplified payment type for display only
type PaymentHistoryItem = {
  id: string;
  productName: string;
  amount: number;
  status: string;
  paymentMethod: string;
  paidAt: string | null;
  createdAt: string;
  failureReason?: string | null;
  zarinpalRefId?: string | null;
};

type PaymentHistoryCardsProps = {
  payments: PaymentHistoryItem[];
  isLoading?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  className?: string;
};

export const PaymentHistoryCards = memo(({
  payments,
  isLoading = false,
  className,
}: PaymentHistoryCardsProps) => {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <BillingDisplayContainer
      data={payments}
      isLoading={isLoading}
      dataType="payment"
      variant="card"
      size="md"
      columns="auto"
      gap="md"
      containerClassName={className}
      emptyTitle={t('states.empty.payments')}
      emptyDescription={t('states.empty.paymentsDescription')}
      mapItem={(payment: PaymentHistoryItem) =>
        mapPaymentToContent(
          payment as PaymentData,
          t,
          locale,
        )}
    />
  );
});

PaymentHistoryCards.displayName = 'PaymentHistoryCards';
