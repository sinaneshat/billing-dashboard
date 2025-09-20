'use client';

import { Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { EmptyState, ErrorState, LoadingState } from '@/components/dashboard/dashboard-states';
import { Button } from '@/components/ui/button';
import { usePaymentsQuery } from '@/hooks/queries/payments';

import { PaymentHistoryCards } from './payment-history-cards';

export default function BillingHistory() {
  const t = useTranslations();
  const router = useRouter();
  const paymentsQuery = usePaymentsQuery();

  const payments = paymentsQuery.data?.success && Array.isArray(paymentsQuery.data.data)
    ? paymentsQuery.data.data
    : [];

  if (paymentsQuery.isLoading) {
    return <LoadingState message={t('states.loading.paymentHistory')} />;
  }

  if (paymentsQuery.isError && !paymentsQuery.isLoading) {
    return (
      <ErrorState
        title={t('states.error.loadPaymentHistory')}
        description={t('states.error.loadPaymentHistoryDescription')}
        onRetry={() => {
          paymentsQuery.refetch();
        }}
        retryLabel={t('actions.tryAgain')}
      />
    );
  }

  return (
    <>
      {payments.length > 0
        ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  {t('billing.paymentHistory')}
                </h3>
                <span className="text-sm text-muted-foreground">
                  {payments.length}
                  {' '}
                  {payments.length === 1 ? t('payments.payment') : t('payments.payments')}
                </span>
              </div>
              <PaymentHistoryCards
                payments={payments.map(payment => ({
                  id: payment.id,
                  productName: payment.product?.name || t('products.unknownProduct'),
                  amount: payment.amount,
                  status: payment.status,
                  paymentMethod: payment.paymentMethod || 'zarinpal',
                  paidAt: payment.paidAt,
                  createdAt: payment.createdAt,
                  hasReceipt: payment.status === 'completed' || payment.status === 'paid',
                  failureReason: payment.status === 'failed' ? t('states.error.paymentFailed') : null,
                  zarinpalRefId: payment.zarinpalRefId,
                }))}
                isLoading={false}
                className="w-full"
              />
            </div>
          )
        : (
            <EmptyState
              title={t('states.empty.paymentHistory')}
              description={t('states.empty.paymentHistoryDescription')}
              icon={<Receipt className="h-8 w-8 text-muted-foreground" />}
              action={(
                <Button
                  size="lg"
                  startIcon={<Receipt className="h-4 w-4" />}
                  onClick={() => router.push('/dashboard/billing/plans')}
                >
                  {t('billing.viewPlans')}
                </Button>
              )}
            />
          )}
    </>
  );
}
