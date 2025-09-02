'use client';

import { SubscriptionPlansCoherent } from '@/components/billing/subscription-plans-coherent';
import { PageHeader } from '@/components/dashboard/page-header';

export default function SubscriptionPlansScreen() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Plans"
        description="Choose the perfect plan for your needs"
      />
      <SubscriptionPlansCoherent />
    </div>
  );
}
