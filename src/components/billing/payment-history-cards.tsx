'use client';

import { useLocale, useTranslations } from 'next-intl';
import { memo } from 'react';

// Import Zod-inferred type from backend schema - API already provides converted amounts
import type { PaymentWithDetails } from '@/api/routes/payments/schema';

import { BillingDisplayContainer, mapPaymentToContent } from './unified';

// Use Zod-inferred PaymentWithDetails type from backend schema - no custom type needed
type PaymentHistoryCardsProps = {
  payments: PaymentWithDetails[];
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

  // API already provides converted amounts - no client-side conversion needed
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
      mapItem={(payment: PaymentWithDetails) =>
        mapPaymentToContent(
          payment,
          t,
          locale,
        )}
    />
  );
});

PaymentHistoryCards.displayName = 'PaymentHistoryCards';
