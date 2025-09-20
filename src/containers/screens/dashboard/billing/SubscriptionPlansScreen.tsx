'use client';

import { useTranslations } from 'next-intl';

import { SubscriptionPlans } from '@/components/billing/subscription-plans';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardPage, DashboardSection } from '@/components/dashboard/dashboard-states';

/**
 * Subscription Plans Screen Container
 *
 * Screen container that follows established billing screen patterns:
 * - Uses DashboardPage and DashboardSection for consistent layout
 * - Includes proper page header with title and description
 * - Wraps the SubscriptionPlans component for proper screen structure
 * - Maintains consistency with other billing screens
 */
export default function SubscriptionPlansScreen() {
  const t = useTranslations();

  return (
    <DashboardPage>
      <DashboardPageHeader
        title={t('billing.plansTitle')}
        description={t('billing.plansDescription')}
      />

      <DashboardSection delay={0.1}>
        <SubscriptionPlans />
      </DashboardSection>
    </DashboardPage>
  );
}
