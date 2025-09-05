'use client';

import { useTranslations } from 'next-intl';

import { SubscriptionBillingHistoryCoherent } from '@/components/billing/subscription-billing-history-coherent';
import { DashboardPageHeader } from '@/components/ui/dashboard-header';
import { DashboardPage, DashboardSection } from '@/components/ui/dashboard-states';

export default function SubscriptionBillingScreen() {
  const t = useTranslations();
  return (
    <DashboardPage>
      <DashboardPageHeader
        title={t('billing.subscriptionBilling')}
        description={t('billing.subscriptionBillingDescription')}
      />
      <DashboardSection delay={0.1}>
        <SubscriptionBillingHistoryCoherent />
      </DashboardSection>
    </DashboardPage>
  );
}
