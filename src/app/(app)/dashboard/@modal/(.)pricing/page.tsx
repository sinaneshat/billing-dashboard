import { PricingModalScreen } from '@/containers/screens/dashboard/billing';

/**
 * Intercepted Modal Route for Pricing - Server Component
 *
 * Shown when navigating from dashboard to /dashboard/pricing
 * Uses Next.js intercepting routes pattern with (.) prefix
 * Displays available products and pricing options in a modal
 */
export default async function PricingModalPage() {
  return <PricingModalScreen />;
}
