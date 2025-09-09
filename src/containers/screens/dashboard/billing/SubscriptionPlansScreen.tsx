'use client';

import { SubscriptionPlans } from '@/components/billing/subscription-plans';
import { DashboardPage } from '@/components/dashboard/dashboard-states';

type SSOFlowData = {
  initialStep: string;
  selectedProductId: string | null;
  billingMethod?: string;
  priceId?: string;
  referrer?: string;
};

type SubscriptionPlansScreenProps = {
  ssoFlowData?: SSOFlowData;
};

export default function SubscriptionPlansScreen({ ssoFlowData }: SubscriptionPlansScreenProps) {
  return (
    <DashboardPage>
      <SubscriptionPlans ssoFlowData={ssoFlowData} />
    </DashboardPage>
  );
}
