'use client';

import { useTranslations } from 'next-intl';

import { SubscriptionCards } from '@/components/billing/subscription-cards';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardPage, DashboardSection } from '@/components/dashboard/dashboard-states';
import { useSubscriptionsQuery } from '@/hooks/queries/subscriptions';

export default function SubscriptionManagementScreen() {
  const t = useTranslations();
  const subscriptionsQuery = useSubscriptionsQuery();

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
          isLoading={subscriptionsQuery.isLoading}
          isError={subscriptionsQuery.isError}
          error={subscriptionsQuery.error}
          onRetry={() => subscriptionsQuery.refetch()}
        />
      </DashboardSection>
    </DashboardPage>
  );
}
