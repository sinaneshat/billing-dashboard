'use client';

import { ProductionSubscriptionPlans } from '@/components/billing/subscription-plans-production';
import { DashboardPage } from '@/components/ui/dashboard-states';

export default function SubscriptionPlansScreen() {
  return (
    <DashboardPage>
      <ProductionSubscriptionPlans />
    </DashboardPage>
  );
}
