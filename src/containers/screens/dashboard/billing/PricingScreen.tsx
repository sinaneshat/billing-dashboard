'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardContainer } from '@/components/dashboard/dashboard-layout';
import { DashboardPage } from '@/components/dashboard/dashboard-states';
import { PricingContent } from '@/components/pricing/pricing-content';
import {
  useCreateCheckoutSessionMutation,
  useCreateCustomerPortalSessionMutation,
  useProductsQuery,
  useSubscriptionsQuery,
} from '@/hooks';

export default function PricingScreen() {
  const t = useTranslations();
  const [processingPriceId, setProcessingPriceId] = useState<string | null>(null);

  // Fetch products and user subscriptions
  const { data: productsData, isLoading: isLoadingProducts, error: productsError } = useProductsQuery();
  const { data: subscriptionsData, isLoading: isLoadingSubscriptions } = useSubscriptionsQuery();

  const createCheckoutMutation = useCreateCheckoutSessionMutation();
  const createPortalMutation = useCreateCustomerPortalSessionMutation();

  const products = productsData?.success ? productsData.data?.products || [] : [];
  const subscriptions = subscriptionsData?.success ? subscriptionsData.data?.subscriptions || [] : [];

  // Handle subscription (new checkout)
  const handleSubscribe = async (priceId: string) => {
    setProcessingPriceId(priceId);
    try {
      const result = await createCheckoutMutation.mutateAsync({
        json: { priceId },
      });

      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setProcessingPriceId(null);
    }
  };

  // Handle manage billing (customer portal)
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

  const isLoading = isLoadingProducts || isLoadingSubscriptions;

  return (
    <DashboardPage>
      <DashboardPageHeader
        title={t('billing.products.title')}
        description={t('billing.products.description')}
      />

      <DashboardContainer>
        <PricingContent
          products={products}
          subscriptions={subscriptions}
          isLoading={isLoading}
          error={productsError}
          processingPriceId={processingPriceId}
          onSubscribe={handleSubscribe}
          onManageBilling={handleManageBilling}
          isProcessing={createCheckoutMutation.isPending || createPortalMutation.isPending}
          showSubscriptionBanner={false}
        />
      </DashboardContainer>
    </DashboardPage>
  );
}
