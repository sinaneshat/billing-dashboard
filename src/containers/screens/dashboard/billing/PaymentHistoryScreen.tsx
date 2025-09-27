'use client';

import { useTranslations } from 'next-intl';

import BillingHistory from '@/components/billing/billing-history';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardPage, DashboardSection } from '@/components/dashboard/dashboard-states';

/**
 * Payment History Screen - Shows actual payment transactions
 * This screen displays the user's billing history with all payment transactions,
 * NOT payment method contracts
 */
export default function PaymentHistoryScreen() {
  const t = useTranslations();

  return (
    <DashboardPage>
      <DashboardPageHeader
        title={t('billing.paymentHistory')}
        description={t('billing.paymentHistoryDescription')}
      />

      <DashboardSection delay={0.1}>
        <BillingHistory />
      </DashboardSection>
    </DashboardPage>
  );
}
