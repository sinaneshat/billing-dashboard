import { SubscriptionBillingHistory } from '@/components/billing/subscription-billing-history';
import { PageHeader } from '@/components/dashboard/page-header';

export default function SubscriptionBillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Billing"
        description="View your subscription billing history and automated charges"
      />
      <SubscriptionBillingHistory />
    </div>
  );
}
