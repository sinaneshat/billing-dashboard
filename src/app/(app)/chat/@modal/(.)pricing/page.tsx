import { PricingModalScreen } from '@/containers/screens/chat/billing';

/**
 * Intercepted Modal Route for Pricing - Server Component
 *
 * Shown when navigating from chat to /chat/pricing
 * Uses Next.js intercepting routes pattern with (.) prefix
 * Displays available products and pricing options in a modal
 */
export default async function PricingModalPage() {
  return <PricingModalScreen />;
}
