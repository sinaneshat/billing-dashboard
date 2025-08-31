import { PaymentHistory } from '@/components/billing/payment-history';
import { PageHeader } from '@/components/dashboard/page-header';

export default function PaymentHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment History"
        description="View and manage your payment transactions"
      />
      <PaymentHistory />
    </div>
  );
}
