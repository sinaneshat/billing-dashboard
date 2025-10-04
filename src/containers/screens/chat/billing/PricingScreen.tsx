'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ChatPageHeader } from '@/components/chat/chat-header';
import { ChatContainer } from '@/components/chat/chat-layout';
import { ChatPage } from '@/components/chat/chat-states';
import { PricingContent } from '@/components/pricing/pricing-content';
import {
  useCancelSubscriptionMutation,
  useCreateCheckoutSessionMutation,
  useCreateCustomerPortalSessionMutation,
  useProductsQuery,
  useSubscriptionsQuery,
  useSwitchSubscriptionMutation,
} from '@/hooks';

export default function PricingScreen() {
  const t = useTranslations();
  const [processingPriceId, setProcessingPriceId] = useState<string | null>(null);

  const { data: productsData, isLoading: isLoadingProducts, error: productsError } = useProductsQuery();
  const { data: subscriptionsData, isLoading: isLoadingSubscriptions } = useSubscriptionsQuery();

  const createCheckoutMutation = useCreateCheckoutSessionMutation();
  const cancelMutation = useCancelSubscriptionMutation();
  const switchMutation = useSwitchSubscriptionMutation();
  const customerPortalMutation = useCreateCustomerPortalSessionMutation();

  const products = productsData?.success ? productsData.data?.products || [] : [];
  const subscriptions = subscriptionsData?.success ? subscriptionsData.data?.subscriptions || [] : [];

  const activeSubscription = subscriptions.find(
    sub => sub.status === 'active' || sub.status === 'trialing',
  );

  const handleSubscribe = async (priceId: string) => {
    setProcessingPriceId(priceId);
    try {
      if (activeSubscription) {
        await switchMutation.mutateAsync({
          param: { id: activeSubscription.id },
          json: { newPriceId: priceId },
        });
      } else {
        const result = await createCheckoutMutation.mutateAsync({
          json: { priceId },
        });

        if (result.success && result.data?.url) {
          window.location.href = result.data.url;
        }
      }
    } catch (err) {
      console.error('Subscription error:', err);
    } finally {
      setProcessingPriceId(null);
    }
  };

  const handleCancel = async (subscriptionId: string) => {
    setProcessingPriceId('canceling');
    try {
      await cancelMutation.mutateAsync({
        param: { id: subscriptionId },
        json: { immediately: false },
      });
    } catch (err) {
      console.error('Cancel error:', err);
    } finally {
      setProcessingPriceId(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const result = await customerPortalMutation.mutateAsync({
        json: {
          returnUrl: window.location.href,
        },
      });

      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
      }
    } catch (err) {
      console.error('Customer portal error:', err);
    }
  };

  const isLoading = isLoadingProducts || isLoadingSubscriptions;
  const isProcessing = createCheckoutMutation.isPending
    || cancelMutation.isPending
    || switchMutation.isPending;

  return (
    <ChatPage>
      <ChatPageHeader
        title={t('billing.products.title')}
        description={t('billing.products.description')}
      />

      <ChatContainer>
        <PricingContent
          products={products}
          subscriptions={subscriptions}
          isLoading={isLoading}
          error={productsError}
          processingPriceId={processingPriceId}
          onSubscribe={handleSubscribe}
          onCancel={handleCancel}
          onManageBilling={handleManageBilling}
          isProcessing={isProcessing}
          showSubscriptionBanner={false}
        />
      </ChatContainer>
    </ChatPage>
  );
}
