import type { Metadata } from 'next';

import BillingSuccessScreen from '@/containers/screens/chat/billing/BillingSuccessScreen';

export const metadata: Metadata = {
  title: 'Payment Successful',
  description: 'Your payment has been processed successfully',
};

export default function BillingSuccessPage() {
  return <BillingSuccessScreen />;
}
