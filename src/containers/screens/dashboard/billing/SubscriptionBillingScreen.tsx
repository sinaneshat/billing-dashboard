'use client';

import { SubscriptionBillingHistoryCoherent } from '@/components/billing/subscription-billing-history-coherent';
import { PageHeader } from '@/components/dashboard/page-header';

export default function SubscriptionBillingScreen() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Billing"
        description="View your subscription billing history and automated charges"
      />
      <SubscriptionBillingHistoryCoherent />
    </div>
  );
}
