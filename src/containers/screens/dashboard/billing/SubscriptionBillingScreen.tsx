'use client';

import { SubscriptionBillingHistoryCoherent } from '@/components/billing/subscription-billing-history-coherent';
import { DashboardPageHeader } from '@/components/ui/dashboard-header';
import { DashboardPage, DashboardSection } from '@/components/ui/dashboard-states';

export default function SubscriptionBillingScreen() {
  return (
    <DashboardPage>
      <DashboardPageHeader
        title="Subscription Billing"
        description="View your subscription billing history and automated charges"
      />
      <DashboardSection delay={0.1}>
        <SubscriptionBillingHistoryCoherent />
      </DashboardSection>
    </DashboardPage>
  );
}
