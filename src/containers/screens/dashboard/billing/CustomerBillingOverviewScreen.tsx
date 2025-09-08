'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { CustomerBillingOverview } from '@/components/billing/customer-billing-overview';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardPage, DashboardSection } from '@/components/dashboard/dashboard-states';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';
import { usePaymentsQuery } from '@/hooks/queries/payments';
import { useCurrentSubscriptionQuery } from '@/hooks/queries/subscriptions';
import { useQueryUIState } from '@/hooks/utils/query-helpers';

/**
 * Customer-centric billing overview screen
 * Shows personal subscription info, payment history, and quick actions
 * NOT business analytics - this is for end users to manage their billing
 */
export default function CustomerBillingOverviewScreen() {
  const t = useTranslations();

  // Fetch user's current subscription
  const subscriptionQuery = useCurrentSubscriptionQuery();
  const subscriptionUI = useQueryUIState(subscriptionQuery);

  // Fetch user's payment methods
  const paymentMethodsQuery = usePaymentMethodsQuery();
  const paymentMethodsUI = useQueryUIState(paymentMethodsQuery);

  // Fetch user's payment history
  const paymentsQuery = usePaymentsQuery();
  const paymentsUI = useQueryUIState(paymentsQuery);

  // Extract subscription data
  const subscription = subscriptionQuery.data || null;

  // Extract payment methods data
  const paymentMethods = paymentMethodsQuery.data?.success && Array.isArray(paymentMethodsQuery.data.data)
    ? paymentMethodsQuery.data.data
    : [];

  // Transform real payment data for component consumption
  const recentPayments = useMemo(() => {
    const paymentsData = paymentsQuery.data?.success && Array.isArray(paymentsQuery.data.data)
      ? paymentsQuery.data.data
      : [];
    return paymentsData.map(paymentRecord => ({
      id: paymentRecord.id,
      productName: paymentRecord.product?.name || t('billing.unknownProduct'),
      amount: paymentRecord.amount,
      status: paymentRecord.status,
      paidAt: paymentRecord.paidAt,
      createdAt: paymentRecord.createdAt,
      paymentMethod: paymentRecord.paymentMethod,
      hasReceipt: paymentRecord.status === 'completed',
    })).slice(0, 5); // Show recent 5 payments
  }, [paymentsQuery.data, t]);

  const isLoading = subscriptionUI.isLoading || paymentMethodsUI.isLoading || paymentsUI.isLoading;

  return (
    <DashboardPage>
      <DashboardPageHeader
        title={t('billing.title')}
        description={t('billing.description')}
      />

      <DashboardSection delay={0.1}>
        <CustomerBillingOverview
          subscription={subscription}
          recentPayments={recentPayments}
          paymentMethods={paymentMethods}
          isLoading={isLoading}
          className="w-full"
        />
      </DashboardSection>
    </DashboardPage>
  );
}
