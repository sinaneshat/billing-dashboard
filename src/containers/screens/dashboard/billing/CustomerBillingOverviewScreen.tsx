'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { CustomerBillingOverview } from '@/components/billing/customer-billing-overview';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardPage, DashboardSection } from '@/components/dashboard/dashboard-states';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';
import { usePaymentsQuery } from '@/hooks/queries/payments';
import { useCurrentSubscriptionQuery } from '@/hooks/queries/subscriptions';

/**
 * Customer-centric billing overview screen
 * Shows personal subscription info, payment history, and quick actions
 * NOT business analytics - this is for end users to manage their billing
 */
export default function CustomerBillingOverviewScreen() {
  const t = useTranslations();

  // Fetch user's current subscription
  const subscriptionQuery = useCurrentSubscriptionQuery();

  // Fetch user's payment methods
  const paymentMethodsQuery = usePaymentMethodsQuery();

  // Fetch user's payment history
  const paymentsQuery = usePaymentsQuery();

  // Extract subscription data
  const subscription = subscriptionQuery.data || null;

  // Extract payment methods data
  const paymentMethods = paymentMethodsQuery.data?.success && Array.isArray(paymentMethodsQuery.data.data)
    ? paymentMethodsQuery.data.data
    : [];

  // Use Zod-inferred PaymentWithDetails data directly - no transformation needed
  const recentPayments = useMemo(() => {
    const paymentsData = paymentsQuery.data?.success && Array.isArray(paymentsQuery.data.data)
      ? paymentsQuery.data.data
      : [];
    return paymentsData.slice(0, 5); // Show recent 5 payments
  }, [paymentsQuery.data]);

  const isLoading = subscriptionQuery.isLoading || paymentMethodsQuery.isLoading || paymentsQuery.isLoading;

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
