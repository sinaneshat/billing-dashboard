'use client';

import { Calendar, CreditCard, Receipt } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { EmptyState, ErrorState, LoadingState } from '@/components/dashboard/dashboard-states';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePaymentsQuery } from '@/hooks/queries/payments';
import { useSubscriptionsQuery } from '@/hooks/queries/subscriptions';
import { formatBillingDate } from '@/lib/format';

import { PaymentHistoryCards } from './payment-history-cards';

export default function BillingHistory() {
  const t = useTranslations();
  const locale = useLocale();
  const paymentsQuery = usePaymentsQuery();
  const subscriptionsQuery = useSubscriptionsQuery();

  const payments = paymentsQuery.data?.success && Array.isArray(paymentsQuery.data.data)
    ? paymentsQuery.data.data
    : [];

  const subscriptions = subscriptionsQuery.data?.success && Array.isArray(subscriptionsQuery.data.data)
    ? subscriptionsQuery.data.data
    : [];

  // Get active subscription with upcoming billing
  const activeSubscription = subscriptions.find(sub => sub.status === 'active' && sub.nextBillingDate);

  if (paymentsQuery.isLoading || subscriptionsQuery.isLoading) {
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

  if ((paymentsQuery.isError && !paymentsQuery.isLoading) || (subscriptionsQuery.isError && !subscriptionsQuery.isLoading)) {
    return (
      <ErrorState
        variant="card"
        title={t('states.error.loadPaymentHistory')}
        description={t('states.error.loadPaymentHistoryDescription')}
        onRetry={() => {
          paymentsQuery.refetch();
          subscriptionsQuery.refetch();
        }}
        retryLabel={t('actions.tryAgain')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Billing Section */}
      {activeSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {t('billing.upcomingBilling')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{t('billing.nextBilling')}</div>
                <div className="text-lg font-semibold">
                  {formatBillingDate(activeSubscription.nextBillingDate!, locale, 'long')}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{t('billing.amount')}</div>
                <div className="text-lg font-semibold text-primary">
                  {activeSubscription.formattedPrice}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{t('billing.currentPlan')}</div>
                <div className="font-medium">
                  {activeSubscription.product?.name || t('billing.noPlan')}
                </div>
              </div>
              {activeSubscription.paymentMethod && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{t('payment.paymentMethod')}</div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {activeSubscription.paymentMethod.contractDisplayName}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History Section */}
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
                payments={payments}
                isLoading={false}
                className="w-full"
              />
            </div>
          )
        : !activeSubscription
            ? (
                <EmptyState
                  variant="payments"
                  style="dashed"
                  size="lg"
                  title={t('states.empty.paymentHistory')}
                  description={t('states.empty.paymentHistoryDescription')}
                  icon={<Receipt className="h-12 w-12 text-primary/60" />}
                />
              )
            : null}
    </div>
  );
}
