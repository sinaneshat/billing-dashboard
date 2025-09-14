'use client';

import {
  Download,
  EllipsisVerticalIcon,
  Eye,
  Receipt,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { memo, useCallback } from 'react';

import { EmptyCard, LoadingCard, StatusCard } from '@/components/dashboard/dashboard-cards';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { PaymentStatusBadge } from '@/components/ui/status-badge';
import { useDownloadInvoiceMutation, useDownloadReceiptMutation, useRetryPaymentMutation } from '@/hooks/mutations/payments';
import { formatTomanCurrency } from '@/lib/format';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

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

  // Mutations for payment actions
  const retryPaymentMutation = useRetryPaymentMutation();
  const downloadReceiptMutation = useDownloadReceiptMutation();
  const downloadInvoiceMutation = useDownloadInvoiceMutation();

  // Action handlers
  const handleViewPayment = useCallback((paymentId: string) => {
    router.push(`/dashboard/billing/payments/${paymentId}`);
  }, [router]);

  const handleDownloadReceipt = useCallback(async (paymentId: string) => {
    try {
      await downloadReceiptMutation.mutateAsync({ param: { id: paymentId } });
      showSuccessToast(t('payments.receiptDownloaded'));
    } catch {
      showErrorToast(t('payments.receiptDownloadFailed'));
    }
  }, [downloadReceiptMutation, t]);

  const handleDownloadInvoice = useCallback(async (paymentId: string) => {
    try {
      await downloadInvoiceMutation.mutateAsync({ param: { id: paymentId } });
      showSuccessToast(t('payments.invoiceDownloaded'));
    } catch {
      showErrorToast(t('payments.invoiceDownloadFailed'));
    }
  }, [downloadInvoiceMutation, t]);

  const handleRetryPayment = useCallback(async (paymentId: string) => {
    try {
      await retryPaymentMutation.mutateAsync({ param: { id: paymentId } });
      showSuccessToast(t('payments.retryInitiated'));
    } catch {
      showErrorToast(t('payments.retryFailed'));
    }
  }, [retryPaymentMutation, t]);

  const defaultEmptyTitle = emptyStateTitle || t('payments.empty');
  const defaultEmptyDescription = emptyStateDescription || t('payments.emptyDescription');
  // Render individual payment card
  const renderPaymentCard = (payment: PaymentHistoryItem, index: number) => {
    const getStatusColor = () => {
      switch (payment.status) {
        case 'completed':
        case 'paid':
          return 'success';
        case 'failed':
          return 'error';
        case 'pending':
        case 'processing':
          return 'warning';
        default:
          return 'default';
      }
    };

    return (
      <StaggerItem key={payment.id} delay={index * 0.05}>
        <StatusCard
          title={payment.productName}
          subtitle={payment.status === 'failed' && payment.failureReason ? payment.failureReason : undefined}
          status={<PaymentStatusBadge status={payment.status} size="sm" />}
          icon={<ShoppingBag className="h-4 w-4" />}
          statusColor={getStatusColor()}
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
          action={(
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label={t('actions.view')}
                  aria-haspopup="menu"
                >
                  <EllipsisVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleViewPayment(payment.id)}
                  className="cursor-pointer"
                  aria-label={t('actions.view')}
                >
                  <Eye className="h-4 w-4 me-2" />
                  {t('actions.view')}
                </DropdownMenuItem>
                {payment.hasReceipt && (payment.status === 'completed' || payment.status === 'paid') && (
                  <DropdownMenuItem
                    onClick={() => handleDownloadReceipt(payment.id)}
                    className="cursor-pointer"
                    disabled={downloadReceiptMutation.isPending}
                    aria-label={downloadReceiptMutation.isPending ? t('states.loading.downloading') : t('payments.downloadReceipt')}
                  >
                    <Download className="h-4 w-4 me-2" />
                    {downloadReceiptMutation.isPending ? t('states.loading.downloading') : t('payments.downloadReceipt')}
                  </DropdownMenuItem>
                )}
                {(payment.status === 'completed' || payment.status === 'paid') && (
                  <DropdownMenuItem
                    onClick={() => handleDownloadInvoice(payment.id)}
                    className="cursor-pointer"
                    disabled={downloadInvoiceMutation.isPending}
                    aria-label={downloadInvoiceMutation.isPending ? t('states.loading.downloading') : t('payments.downloadInvoice')}
                  >
                    <Receipt className="h-4 w-4 me-2" />
                    {downloadInvoiceMutation.isPending ? t('states.loading.downloading') : t('payments.downloadInvoice')}
                  </DropdownMenuItem>
                )}
                {payment.status === 'failed' && (
                  <DropdownMenuItem
                    onClick={() => handleRetryPayment(payment.id)}
                    className="text-destructive cursor-pointer"
                    disabled={retryPaymentMutation.isPending}
                    aria-label={retryPaymentMutation.isPending ? t('states.loading.retrying') : t('actions.retry')}
                  >
                    <RotateCcw className="h-4 w-4 me-2" />
                    {retryPaymentMutation.isPending ? t('states.loading.retrying') : t('actions.retry')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      </StaggerItem>
    );
  };

  if (isLoading) {
    return (
      <FadeIn className={className}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('payments.title')}</h3>
            <span className="text-sm text-muted-foreground">{t('states.loading.default')}</span>
          </div>
          <div className="grid gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <LoadingCard key={i} title={t('states.loading.payments')} rows={2} variant="status" />
            ))}
          </div>
        </div>
      </FadeIn>
    );
  }

  if (payments.length === 0) {
    return (
      <FadeIn className={className}>
        <EmptyCard
          title={defaultEmptyTitle}
          description={defaultEmptyDescription}
          icon={<Receipt className="h-8 w-8 text-muted-foreground" />}
        />
      </FadeIn>
    );
  }

  return (
    <FadeIn className={className}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('payments.title')}</h3>
          <span className="text-sm text-muted-foreground">
            {payments.length}
          </span>
        </div>

        <StaggerContainer className="grid gap-4">
          {payments.map((payment, index) => renderPaymentCard(payment, index))}
        </StaggerContainer>
      </div>
    </FadeIn>
  );
});

PaymentHistoryCards.displayName = 'PaymentHistoryCards';
