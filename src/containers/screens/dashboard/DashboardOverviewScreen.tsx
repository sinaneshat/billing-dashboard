'use client';

import { useMemo } from 'react';

import { CustomerBillingOverview } from '@/components/billing/customer-billing-overview';
import { DashboardPageHeader } from '@/components/ui/dashboard-header';
import { DashboardContainer } from '@/components/ui/dashboard-layout';
import { DashboardPage, DashboardSection } from '@/components/ui/dashboard-states';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';
import { usePaymentsQuery } from '@/hooks/queries/payments';
import { useCurrentSubscriptionQuery } from '@/hooks/queries/subscriptions';
import { useQueryUIState } from '@/hooks/utils/query-helpers';
import { useSession } from '@/lib/auth/client';

export default function DashboardOverviewScreen() {
  // Get session from Better Auth client (uses cached server data)
  const { data: session } = useSession();

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
      productName: paymentRecord.product?.name || 'Unknown Product',
      amount: paymentRecord.amount,
      status: paymentRecord.status,
      paidAt: paymentRecord.paidAt,
      createdAt: paymentRecord.createdAt,
      paymentMethod: paymentRecord.paymentMethod,
      hasReceipt: paymentRecord.status === 'completed',
    })).slice(0, 5); // Show recent 5 payments
  }, [paymentsQuery.data]);

  const isLoading = subscriptionUI.isLoading || paymentMethodsUI.isLoading || paymentsUI.isLoading;
  const user = session?.user;

  return (
    <DashboardPage>
      <DashboardPageHeader
        title={`Welcome back, ${user?.name || user?.email?.split('@')[0] || 'User'}!`}
        description="Manage your billing and subscriptions from your comprehensive dashboard overview"
      />

      {/* Official shadcn/ui dashboard-01 block layout pattern */}
      <DashboardContainer>
        <DashboardSection delay={0.1}>
          <CustomerBillingOverview
            subscription={subscription}
            recentPayments={recentPayments}
            paymentMethods={paymentMethods}
            loading={isLoading}
          />
        </DashboardSection>
      </DashboardContainer>
    </DashboardPage>
  );
}
