'use client';

import { useRouter } from 'next/navigation';

import { PricingModal } from '@/components/modals/pricing-modal';
import {
  useCreateCheckoutSessionMutation,
  useCreateCustomerPortalSessionMutation,
  useProductsQuery,
  useSubscriptionsQuery,
} from '@/hooks';

/**
 * Pricing Modal Screen
 *
 * Intercepted modal route for pricing display
 * Shown when navigating from dashboard to /dashboard/pricing
 * Uses Next.js intercepting routes pattern with (.) prefix
 * Displays available products and pricing options
 */
export default function PricingModalScreen() {
  const router = useRouter();

  const { data: productsData, isLoading: productsLoading } = useProductsQuery();
  const { data: subscriptionsData } = useSubscriptionsQuery();
  const createCheckoutMutation = useCreateCheckoutSessionMutation();
  const createPortalMutation = useCreateCustomerPortalSessionMutation();

  const products = productsData?.success ? productsData.data?.products || [] : [];
  const subscriptions = subscriptionsData?.success ? subscriptionsData.data?.subscriptions || [] : [];

  const handleSubscribe = async (priceId: string) => {
    const result = await createCheckoutMutation.mutateAsync({
      json: { priceId },
    });

    if (result.success && result.data?.url) {
      window.location.href = result.data.url;
    }
  };

  const handleManageBilling = async () => {
    try {
      const result = await createPortalMutation.mutateAsync({ json: {} });

      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
      }
    } catch (err) {
      console.error('Portal error:', err);
    }
  };

  return (
    <PricingModal
      open
      onOpenChange={(open) => {
        if (!open)
          router.back();
      }}
      products={products}
      subscriptions={subscriptions}
      isLoading={productsLoading}
      onSubscribe={handleSubscribe}
      onManageBilling={handleManageBilling}
    />
  );
}
