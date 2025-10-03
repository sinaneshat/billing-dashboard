'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { PricingContent } from '@/components/pricing/pricing-content';

import { BaseModal } from './base-modal';

type Product = {
  id: string;
  name: string;
  description?: string | null;
  prices?: Array<{
    id: string;
    currency: string;
    unitAmount: number;
    interval?: string | null;
    trialPeriodDays?: number | null;
  }>;
  features?: string[] | null;
};

type Subscription = {
  id: string;
  status: string;
  productId: string;
  currentPeriodEnd?: string | null;
};

type PricingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  subscriptions: Subscription[];
  isLoading?: boolean;
  onSubscribe: (priceId: string) => Promise<void>;
  onManageBilling: () => void;
};

/**
 * Pricing Modal Component
 *
 * Displays available products with pricing and subscription management in a modal dialog.
 * Uses the shared PricingContent component to ensure consistency with the standalone pricing page.
 *
 * @param props - Component props
 * @param props.open - Controls modal visibility
 * @param props.onOpenChange - Callback when modal visibility changes
 * @param props.products - Array of available products
 * @param props.subscriptions - Array of user subscriptions
 * @param props.isLoading - Loading state for products
 * @param props.onSubscribe - Callback when user subscribes to a product
 * @param props.onManageBilling - Callback to open Stripe customer portal
 */
export function PricingModal({
  open,
  onOpenChange,
  products,
  subscriptions,
  isLoading,
  onSubscribe,
  onManageBilling,
}: PricingModalProps) {
  const t = useTranslations();
  const [subscribingPriceId, setSubscribingPriceId] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
    setSubscribingPriceId(priceId);

    try {
      await onSubscribe(priceId);
    } catch (err) {
      console.error('Subscription error:', err);
    } finally {
      setSubscribingPriceId(null);
    }
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('pricing.modal.title')}
      description={t('pricing.modal.description')}
      size="xl"
    >
      <PricingContent
        products={products}
        subscriptions={subscriptions}
        isLoading={isLoading}
        error={null}
        processingPriceId={subscribingPriceId}
        onSubscribe={handleSubscribe}
        onManageBilling={onManageBilling}
        isProcessing={false}
        showSubscriptionBanner={false}
      />
    </BaseModal>
  );
}
