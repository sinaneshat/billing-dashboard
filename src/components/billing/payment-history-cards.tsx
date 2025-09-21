'use client';

import { ShoppingBag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { memo } from 'react';

import { BillingCardContainer } from '@/components/billing/shared/billing-card-container';
import { StatusCard } from '@/components/dashboard/dashboard-cards';
import { PaymentStatusBadge } from '@/components/ui/status-badge';
import { formatTomanCurrency } from '@/lib/format';

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
  emptyStateTitle,
  emptyStateDescription,
  className,
}: PaymentHistoryCardsProps) => {
  const t = useTranslations();
  const locale = useLocale();

  const defaultEmptyTitle = emptyStateTitle || t('payments.empty');
  const defaultEmptyDescription = emptyStateDescription || t('payments.emptyDescription');

  return (
    <BillingCardContainer<PaymentHistoryItem>
      items={payments}
      isLoading={isLoading}
      emptyStateTitle={defaultEmptyTitle}
      emptyStateDescription={defaultEmptyDescription}
      className={className}
    >
      {(payment: PaymentHistoryItem, _index: number) => (
        <StatusCard
          title={payment.productName}
          subtitle={payment.status === 'failed' && payment.failureReason ? payment.failureReason : undefined}
          status={<PaymentStatusBadge status={payment.status} size="sm" />}
          icon={<ShoppingBag className="h-4 w-4" />}
          primaryInfo={(
            <span className="text-2xl font-semibold text-foreground">
              {formatTomanCurrency(payment.amount)}
            </span>
          )}
          secondaryInfo={(
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {new Date(payment.paidAt || payment.createdAt).toLocaleDateString(locale, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              {payment.zarinpalRefId && (
                <span className="text-xs" title={payment.zarinpalRefId}>
                  #
                  {payment.zarinpalRefId.slice(-6)}
                </span>
              )}
            </div>
          )}
        />
      )}
    </BillingCardContainer>
  );
});

PaymentHistoryCards.displayName = 'PaymentHistoryCards';
