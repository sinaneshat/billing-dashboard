import { BillingSuccessScreen } from '@/containers/screens/dashboard/billing';

/**
 * Billing Success Page - Server Component
 *
 * Displays success confirmation after Stripe checkout
 * Implements Theo's "Stay Sane with Stripe" pattern for webhook sync
 */
export default async function BillingSuccessPage() {
  return <BillingSuccessScreen />;
}
