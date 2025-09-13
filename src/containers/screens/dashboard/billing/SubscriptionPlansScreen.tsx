'use client';

import { SubscriptionPlans } from '@/components/billing/subscription-plans';
import { DashboardPage } from '@/components/dashboard/dashboard-states';

type SubscriptionPlansScreenProps = {
  ssoFlowData?: {
    priceId?: string;
    billing?: string;
    step?: string;
  };
};

export default function SubscriptionPlansScreen({ ssoFlowData }: SubscriptionPlansScreenProps) {
  return (
    <DashboardPage>
      <SubscriptionPlans ssoFlowData={ssoFlowData} />
    </DashboardPage>
  );
}
