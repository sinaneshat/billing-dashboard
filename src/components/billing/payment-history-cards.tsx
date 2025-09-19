'use client';

import {
  Download,
  Eye,
  Receipt,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { memo, useCallback } from 'react';

import { BillingActionMenu } from '@/components/billing/shared/billing-action-menu';
import { BillingCardContainer } from '@/components/billing/shared/billing-card-container';
import { useBillingActions } from '@/components/billing/shared/use-billing-actions';
import { StatusCard } from '@/components/dashboard/dashboard-cards';
import { FadeIn } from '@/components/ui/motion';
import { PaymentStatusBadge } from '@/components/ui/status-badge';
import { useDownloadInvoiceMutation, useDownloadReceiptMutation, useRetryPaymentMutation } from '@/hooks/mutations/payments';
import { formatTomanCurrency } from '@/lib/format';

// Enhanced payment type with better field handling
type PaymentHistoryItem = {
  id: string;
  productName: string;
  amount: number;
  status: string;
  paymentMethod: string;
  paidAt: string | null;
  createdAt: string;
  hasReceipt: boolean;
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
  const router = useRouter();
  const { createDownloadAction, createRetryAction } = useBillingActions();

  // Mutations for payment actions
  const retryPaymentMutation = useRetryPaymentMutation();
  const downloadReceiptMutation = useDownloadReceiptMutation();
  const downloadInvoiceMutation = useDownloadInvoiceMutation();

  // Simplified action handlers using shared hook
  const handleViewPayment = useCallback((paymentId: string) => {
    router.push(`/dashboard/billing/payments/${paymentId}`);
  }, [router]);

  const handleDownloadReceipt = createDownloadAction(
    async (paymentId: string) => {
      await downloadReceiptMutation.mutateAsync({ param: { id: paymentId } });
    },
    'receipt',
  );

  const handleDownloadInvoice = createDownloadAction(
    async (paymentId: string) => {
      await downloadInvoiceMutation.mutateAsync({ param: { id: paymentId } });
    },
    'invoice',
  );

  const handleRetryPayment = createRetryAction(
    async (paymentId: string) => {
      await retryPaymentMutation.mutateAsync({ param: { id: paymentId } });
    },
  );

  const defaultEmptyTitle = emptyStateTitle || t('payments.empty');
  const defaultEmptyDescription = emptyStateDescription || t('payments.emptyDescription');

  // Create action menu for each payment using shared component
  const createActionMenu = useCallback((payment: PaymentHistoryItem) => {
    const actions = [
      {
        id: 'view',
        label: t('actions.view'),
        icon: Eye,
        onClick: () => handleViewPayment(payment.id),
      },
    ];

    if (payment.hasReceipt && (payment.status === 'completed' || payment.status === 'paid')) {
      actions.push({
        id: 'download-receipt',
        label: t('payments.downloadReceipt'),
        icon: Download,
        onClick: () => handleDownloadReceipt(payment.id),
      });
    }

    if (payment.status === 'completed' || payment.status === 'paid') {
      actions.push({
        id: 'download-invoice',
        label: t('payments.downloadInvoice'),
        icon: Receipt,
        onClick: () => handleDownloadInvoice(payment.id),
      });
    }

    if (payment.status === 'failed') {
      actions.push({
        id: 'retry',
        label: t('actions.retry'),
        icon: RotateCcw,
        onClick: () => handleRetryPayment(payment.id),
      });
    }

    return <BillingActionMenu actions={actions} />;
  }, [handleViewPayment, handleDownloadReceipt, handleDownloadInvoice, handleRetryPayment, t]);

  return (
    <BillingCardContainer<PaymentHistoryItem>
      items={payments}
      isLoading={isLoading}
      emptyStateTitle={defaultEmptyTitle}
      emptyStateDescription={defaultEmptyDescription}
      className={className}
    >
      {(payment: PaymentHistoryItem, _index: number) => (
        <FadeIn>
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
            action={createActionMenu(payment)}
          />
        </FadeIn>
      )}
    </BillingCardContainer>
  );
});

PaymentHistoryCards.displayName = 'PaymentHistoryCards';
