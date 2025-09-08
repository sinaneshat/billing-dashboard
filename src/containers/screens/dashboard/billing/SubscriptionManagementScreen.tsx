'use client';

import { useTranslations } from 'next-intl';

import { SubscriptionCards } from '@/components/billing/subscription-cards';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardPage, DashboardSection } from '@/components/dashboard/dashboard-states';
import { useSubscriptionsQuery } from '@/hooks/queries/subscriptions';
import { useQueryUIState } from '@/hooks/utils/query-helpers';

export default function SubscriptionManagementScreen() {
  const t = useTranslations();
  const subscriptionsQuery = useSubscriptionsQuery();
  const queryUI = useQueryUIState(subscriptionsQuery);

  const subscriptions = subscriptionsQuery.data?.success && Array.isArray(subscriptionsQuery.data.data)
    ? subscriptionsQuery.data.data
    : [];

  return (
    <DashboardPage>
      <DashboardPageHeader
        title={t('billing.subscriptionsTitle')}
        description={t('billing.subscriptionsDescription')}
      />

      <DashboardSection delay={0.1}>
        <SubscriptionCards
          subscriptions={subscriptions}
          isLoading={queryUI.isLoading}
          className="w-full"
        />
      </DashboardSection>
    </DashboardPage>
  );
}
