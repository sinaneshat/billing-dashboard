import { SubscriptionManagement } from '@/components/billing/subscription-management';
import { PageHeader } from '@/components/dashboard/page-header';

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Manage your active and past subscriptions"
      />
      <SubscriptionManagement />
    </div>
  );
}
