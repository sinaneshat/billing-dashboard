'use client';

import { SubscriptionCards } from '@/components/billing/subscription-cards';
import { DashboardPageHeader } from '@/components/ui/dashboard-header';
import { DashboardPage, DashboardSection } from '@/components/ui/dashboard-states';
import { useSubscriptionsQuery } from '@/hooks/queries/subscriptions';
import { useQueryUIState } from '@/hooks/utils/query-helpers';

export default function SubscriptionManagementScreen() {
  const subscriptionsQuery = useSubscriptionsQuery();
  const queryUI = useQueryUIState(subscriptionsQuery);

  const subscriptions = subscriptionsQuery.data?.success && Array.isArray(subscriptionsQuery.data.data)
    ? subscriptionsQuery.data.data
    : [];

  return (
    <DashboardPage>
      <DashboardPageHeader
        title="Subscriptions"
        description="Manage your active and past subscriptions"
      />

      <DashboardSection delay={0.1}>
        <SubscriptionCards
          subscriptions={subscriptions}
          loading={queryUI.isLoading}
          className="w-full"
        />
      </DashboardSection>
    </DashboardPage>
  );
}
