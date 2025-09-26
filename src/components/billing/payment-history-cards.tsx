'use client';

import { useLocale, useTranslations } from 'next-intl';
import { memo } from 'react';

// Import raw Zod-inferred type from backend schema
import type { Payment } from '@/api/routes/payments/schema';
import { useProductsQuery } from '@/hooks/queries/products';

import { BillingDisplayContainer, mapPaymentToContent } from './unified';

// Use raw Payment type from backend schema
type PaymentHistoryCardsProps = {
  payments: Payment[];
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
  const productsQuery = useProductsQuery();

  const products = productsQuery.data?.success && Array.isArray(productsQuery.data.data)
    ? productsQuery.data.data
    : [];

  // API already provides converted amounts - no client-side conversion needed
  return (
    <BillingDisplayContainer
      data={payments}
      isLoading={isLoading || productsQuery.isLoading}
      dataType="payment"
      variant="card"
      size="md"
      columns="auto"
      gap="md"
      containerClassName={className}
      emptyTitle={t('states.empty.payments')}
      emptyDescription={t('states.empty.paymentsDescription')}
      mapItem={(payment: Payment) => {
        const product = products.find(p => p.id === payment.productId);
        return mapPaymentToContent(
          payment,
          product || null,
          t,
          locale,
        );
      }}
    />
  );
});

PaymentHistoryCards.displayName = 'PaymentHistoryCards';
