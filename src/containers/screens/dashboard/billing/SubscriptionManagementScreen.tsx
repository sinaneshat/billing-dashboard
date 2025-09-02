'use client';

import { SubscriptionsList } from '@/components/billing/subscriptions-list';
import { PageHeader } from '@/components/dashboard/page-header';

export default function SubscriptionManagementScreen() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Manage your active and past subscriptions"
      />
      <SubscriptionsList />
    </div>
  );
}
