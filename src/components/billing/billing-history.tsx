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
    return (
      <LoadingState
        variant="card"
        style="dashed"
        size="lg"
        title={t('states.loading.paymentHistory')}
        message={t('states.loading.please_wait')}
      />
    );
  }

  if (paymentsQuery.isError && !paymentsQuery.isLoading) {
    return (
      <ErrorState
        variant="card"
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
                  paidAt: payment.paidAt ? payment.paidAt.toString() : null,
                  createdAt: payment.createdAt.toString(),
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
              variant="payments"
              style="dashed"
              size="lg"
              title={t('states.empty.paymentHistory')}
              description={t('states.empty.paymentHistoryDescription')}
              icon={<Receipt className="h-12 w-12 text-primary/60" />}
              action={(
                <Button
                  size="lg"
                  onClick={() => router.push('/dashboard/billing/plans')}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  {t('billing.viewPlans')}
                </Button>
              )}
            />
          )}
    </>
  );
}
