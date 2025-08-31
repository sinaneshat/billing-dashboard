import { PaymentMethods } from '@/components/billing/payment-methods';
import { PageHeader } from '@/components/dashboard/page-header';

export default function PaymentMethodsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Methods"
        description="Manage your saved payment methods and billing settings"
      />
      <PaymentMethods />
    </div>
  );
}
