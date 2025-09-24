'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { CustomerBillingOverview } from '@/components/billing/customer-billing-overview';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardContainer } from '@/components/dashboard/dashboard-layout';
import { DashboardPage, DashboardSection } from '@/components/dashboard/dashboard-states';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';
import { usePaymentsQuery } from '@/hooks/queries/payments';
import { useCurrentSubscriptionQuery } from '@/hooks/queries/subscriptions';
import { useSession } from '@/lib/auth/client';

export default function DashboardOverviewScreen() {
  const t = useTranslations();
  // Get session from Better Auth client (uses cached server data)
  const { data: session } = useSession();

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
  const user = session?.user;

  return (
    <DashboardPage>
      <DashboardPageHeader
        title={`${t('dashboard.welcome')}, ${user?.name || user?.email?.split('@')[0] || t('user.defaultName')}!`}
        description={t('dashboard.description')}
      />

      {/* Official shadcn/ui dashboard-01 block layout pattern */}
      <DashboardContainer>
        <DashboardSection delay={0.1}>
          <CustomerBillingOverview
            subscription={subscription}
            recentPayments={recentPayments}
            paymentMethods={paymentMethods}
            isLoading={isLoading}
          />
        </DashboardSection>
      </DashboardContainer>
    </DashboardPage>
  );
}
