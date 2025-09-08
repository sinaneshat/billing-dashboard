'use client';

import { useTranslations } from 'next-intl';

import { BillingHistory } from '@/components/billing/billing-history';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardPage, DashboardSection } from '@/components/dashboard/dashboard-states';

export default function SubscriptionBillingScreen() {
  const t = useTranslations();
  return (
    <DashboardPage>
      <DashboardPageHeader
        title={t('billing.subscriptionBilling')}
        description={t('billing.subscriptionBillingDescription')}
      />
      <DashboardSection delay={0.1}>
        <BillingHistory />
      </DashboardSection>
    </DashboardPage>
  );
}
