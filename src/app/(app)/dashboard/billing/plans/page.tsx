import { SubscriptionPlans } from '@/components/billing/subscription-plans';
import { PageHeader } from '@/components/dashboard/page-header';

export default function PlansPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Plans"
        description="Choose the perfect plan for your needs"
      />
      <SubscriptionPlans />
    </div>
  );
}
